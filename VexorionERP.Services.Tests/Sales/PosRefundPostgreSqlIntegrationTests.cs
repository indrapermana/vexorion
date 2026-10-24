using Microsoft.EntityFrameworkCore;
using Npgsql;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PosRefundPostgreSqlIntegrationTests
{
    [PostgreSqlIntegrationFact]
    public async Task Refund_RollsBackAuditFailure_AndConcurrentRetryCreatesOneRefund()
    {
        var connectionString = PostgreSqlIntegrationFactAttribute.GetValidatedConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;

        await using (var administration = new AppDbContext(options))
        {
            await administration.Database.EnsureDeletedAsync();
            await administration.Database.MigrateAsync();
        }

        try
        {
            await VerifyAuditFailureRollsBackAsync(options);
            await VerifyConcurrentRetryAsync(options);
        }
        finally
        {
            await using var administration = new AppDbContext(options);
            await administration.Database.EnsureDeletedAsync();
        }
    }

    private static async Task VerifyAuditFailureRollsBackAsync(DbContextOptions<AppDbContext> options)
    {
        var data = await SeedAsync(options);
        await using (var db = new AppDbContext(options, new FixedTenantProvider(data.TenantId)))
        {
            var service = CreateService(db, data.TenantId, new ThrowingRefundAuditLogger());
            await Assert.ThrowsAsync<InjectedRefundAuditFailure>(() =>
                service.RefundAsync(data.CashierId, CreateRequest(data)));
        }

        await using var verification = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        Assert.Equal(20m, (await verification.SalesInvoices.SingleAsync(x => x.Id == data.InvoiceId)).PaidTotal);
        Assert.Equal(0m, (await verification.SalesInvoices.SingleAsync(x => x.Id == data.InvoiceId)).AppliedCreditTotal);
        Assert.Equal(8m, (await verification.InventoryBalances.SingleAsync(x => x.TenantId == data.TenantId)).QuantityOnHand);
        Assert.Empty(await verification.PosRefundRecords.Where(x => x.TenantId == data.TenantId).ToListAsync());
        Assert.Empty(await verification.SalesInvoices.Where(x => x.TenantId == data.TenantId && x.CreditNoteOfInvoiceId == data.InvoiceId).ToListAsync());
        Assert.Single(await verification.CustomerPayments.Where(x => x.TenantId == data.TenantId).ToListAsync());
        Assert.Empty(await verification.InventoryMovements.Where(x => x.TenantId == data.TenantId).ToListAsync());
        Assert.Empty(await verification.AuditLogs.Where(x => x.TenantId == data.TenantId && x.EventType == "pos.refund_completed").ToListAsync());
    }

    private static async Task VerifyConcurrentRetryAsync(DbContextOptions<AppDbContext> options)
    {
        var data = await SeedAsync(options);
        var request = CreateRequest(data);
        await using var firstDb = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        await using var secondDb = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        var firstService = CreateService(firstDb, data.TenantId, new PersistingRefundAuditLogger(firstDb));
        var secondService = CreateService(secondDb, data.TenantId, new PersistingRefundAuditLogger(secondDb));

        var results = await Task.WhenAll(
            firstService.RefundAsync(data.CashierId, request),
            secondService.RefundAsync(data.CashierId, request));

        Assert.All(results, result => Assert.True(result.Succeeded, result.ErrorMessage));
        Assert.Single(results.Where(result => result.Value!.Replayed));
        Assert.Equal(results[0].Value!.RefundId, results[1].Value!.RefundId);

        await using var verification = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        Assert.Single(await verification.PosRefundRecords.Where(x => x.TenantId == data.TenantId).ToListAsync());
        Assert.Single(await verification.SalesInvoices.Where(x => x.TenantId == data.TenantId && x.CreditNoteOfInvoiceId == data.InvoiceId).ToListAsync());
        Assert.Equal(2, await verification.CustomerPayments.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Single(await verification.InventoryMovements.Where(x => x.TenantId == data.TenantId).ToListAsync());
        Assert.Equal(10m, (await verification.SalesInvoices.SingleAsync(x => x.Id == data.InvoiceId)).PaidTotal);
        Assert.Equal(10m, (await verification.SalesInvoices.SingleAsync(x => x.Id == data.InvoiceId)).AppliedCreditTotal);
        Assert.Equal(9m, (await verification.InventoryBalances.SingleAsync(x => x.TenantId == data.TenantId)).QuantityOnHand);
        Assert.Single(await verification.AuditLogs.Where(x => x.TenantId == data.TenantId && x.EventType == "pos.refund_completed").ToListAsync());
    }

    private static PosRefundService CreateService(AppDbContext db, Guid tenantId, IAuditLogger auditLogger)
    {
        return new PosRefundService(db, new FixedTenantProvider(tenantId), auditLogger);
    }

    private static async Task<RefundData> SeedAsync(DbContextOptions<AppDbContext> options)
    {
        var data = new RefundData();
        await using var db = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        db.Tenants.Add(new Tenant { Id = data.TenantId, Code = $"POS-{data.TenantId:N}", Name = "POS refund PostgreSQL test" });
        var cashierUserName = $"cashier-{data.TenantId:N}";
        var cashierEmail = $"cashier-{data.TenantId:N}@pos.test";
        db.Users.Add(new User
        {
            Id = data.CashierId,
            TenantId = data.TenantId,
            UserName = cashierUserName,
            NormalizedUserName = cashierUserName.ToUpperInvariant(),
            Email = cashierEmail,
            NormalizedEmail = cashierEmail.ToUpperInvariant(),
        });
        db.Customers.Add(new Customer { Id = data.CustomerId, TenantId = data.TenantId, CustomerNumber = "C-1", Name = "Walk-in" });
        db.Warehouses.Add(new Warehouse { Id = data.WarehouseId, TenantId = data.TenantId, Code = "MAIN", Name = "Main" });
        db.Products.Add(new Product { Id = data.ProductId, TenantId = data.TenantId, Sku = "SKU-1", Name = "Widget", SalesPrice = 10m });
        db.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = data.TenantId,
            ProductId = data.ProductId,
            WarehouseId = data.WarehouseId,
            QuantityOnHand = 8m,
        });
        db.ShiftSessions.Add(new ShiftSession
        {
            Id = data.ShiftId,
            TenantId = data.TenantId,
            CashierId = data.CashierId,
            CashierName = "Integration cashier",
            CurrencyCode = "USD",
            Status = ShiftStatus.Open,
        });
        db.SalesOrders.Add(new SalesOrder
        {
            Id = data.OrderId,
            TenantId = data.TenantId,
            OrderNumber = $"SO-{data.TenantId:N}",
            CustomerId = data.CustomerId,
            WarehouseId = data.WarehouseId,
            OrderDate = today,
            RequiredDate = today,
            Status = DocumentStatus.Completed,
            CurrencyCode = "USD",
            TotalAmount = 20m,
        });
        db.SalesShipments.Add(new SalesShipment
        {
            Id = data.ShipmentId,
            TenantId = data.TenantId,
            ShipmentNumber = $"SHP-{data.TenantId:N}",
            SalesOrderId = data.OrderId,
            WarehouseId = data.WarehouseId,
            Status = DocumentStatus.Completed,
        });
        db.SalesInvoices.Add(new SalesInvoice
        {
            Id = data.InvoiceId,
            TenantId = data.TenantId,
            InvoiceNumber = $"INV-{data.TenantId:N}",
            CustomerId = data.CustomerId,
            SourceSalesOrderId = data.OrderId,
            SourceSalesShipmentId = data.ShipmentId,
            InvoiceDate = today,
            DueDate = today,
            CurrencyCode = "USD",
            Subtotal = 20m,
            GrandTotal = 20m,
            PaidTotal = 20m,
            Status = InvoiceStatus.Paid,
            Lines =
            [
                new SalesInvoiceLine
                {
                    Id = data.InvoiceLineId,
                    TenantId = data.TenantId,
                    ProductId = data.ProductId,
                    Quantity = 2m,
                    UnitPrice = 10m,
                },
            ],
        });
        db.CustomerPayments.Add(new CustomerPayment
        {
            Id = data.PaymentId,
            TenantId = data.TenantId,
            CustomerId = data.CustomerId,
            SalesInvoiceId = data.InvoiceId,
            PaymentDate = today,
            Amount = 20m,
            CurrencyCode = "USD",
            PaymentMethod = "CASH",
        });
        db.PosCheckoutRecords.Add(new PosCheckoutRecord
        {
            TenantId = data.TenantId,
            IdempotencyKey = Guid.NewGuid(),
            CashierId = data.CashierId,
            ShiftId = data.ShiftId,
            RequestHash = new string('A', 64),
            SalesOrderId = data.OrderId,
            SalesShipmentId = data.ShipmentId,
            SalesInvoiceId = data.InvoiceId,
            CustomerPaymentId = data.PaymentId,
            ResponseJson = "{}",
        });
        await db.SaveChangesAsync();
        return data;
    }

    private static PosRefundRequest CreateRequest(RefundData data) => new()
    {
        IdempotencyKey = Guid.NewGuid(),
        ShiftId = data.ShiftId,
        SalesInvoiceId = data.InvoiceId,
        Reason = "Damaged item",
        Lines =
        [
            new PosRefundLineRequest
            {
                SalesInvoiceLineId = data.InvoiceLineId,
                Quantity = 1m,
                ReturnToStock = true,
            },
        ],
    };

    private sealed class RefundData
    {
        public Guid TenantId { get; } = Guid.NewGuid();
        public Guid CashierId { get; } = Guid.NewGuid();
        public Guid ShiftId { get; } = Guid.NewGuid();
        public Guid CustomerId { get; } = Guid.NewGuid();
        public Guid WarehouseId { get; } = Guid.NewGuid();
        public Guid ProductId { get; } = Guid.NewGuid();
        public Guid InvoiceId { get; } = Guid.NewGuid();
        public Guid InvoiceLineId { get; } = Guid.NewGuid();
        public Guid OrderId { get; } = Guid.NewGuid();
        public Guid ShipmentId { get; } = Guid.NewGuid();
        public Guid PaymentId { get; } = Guid.NewGuid();
    }

    private sealed class ThrowingRefundAuditLogger : IAuditLogger
    {
        public Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId,
            string? entityName, string? entityId, string? description, object? metadata = null,
            CancellationToken cancellationToken = default)
            => throw new InjectedRefundAuditFailure();
    }

    private sealed class InjectedRefundAuditFailure : Exception;

    private sealed class PersistingRefundAuditLogger(AppDbContext db) : IAuditLogger
    {
        public async Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId,
            string? entityName, string? entityId, string? description, object? metadata = null,
            CancellationToken cancellationToken = default)
        {
            db.AuditLogs.Add(new AuditLog
            {
                TenantId = tenantId!.Value,
                EventType = eventType,
                ActorUserId = actorUserId,
                TargetUserId = targetUserId,
                EntityName = entityName,
                EntityId = entityId,
                Description = description,
            });
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}