using Microsoft.EntityFrameworkCore;
using Npgsql;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PosCheckoutPostgreSqlIntegrationTests
{
    [PostgreSqlIntegrationFact]
    public async Task Checkout_RollsBackEveryCheckpoint_AndConcurrentRetryCreatesOneSale()
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
            foreach (var checkpoint in Enum.GetValues<PosCheckoutTransactionCheckpoint>())
            {
                var data = await SeedAsync(options);
                await using var db = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
                var service = CreateService(db, data.TenantId, new ThrowingObserver(checkpoint));

                await Assert.ThrowsAsync<InjectedCheckoutFailureException>(() =>
                    service.CheckoutAsync(data.CashierId, CreateRequest(data)));

                db.ChangeTracker.Clear();
                Assert.Equal(10m, (await db.InventoryBalances.SingleAsync(x => x.TenantId == data.TenantId)).QuantityOnHand);
                Assert.Empty(await db.InventoryMovements.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.SalesOrders.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.SalesShipments.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.SalesInvoices.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.CustomerPayments.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.PosCheckoutRecords.Where(x => x.TenantId == data.TenantId).ToListAsync());
                Assert.Empty(await db.AuditLogs.Where(x => x.TenantId == data.TenantId).ToListAsync());
            }

            await VerifyConcurrentRetryAsync(options);
        }
        finally
        {
            await using var administration = new AppDbContext(options);
            await administration.Database.EnsureDeletedAsync();
        }
    }

    private static async Task VerifyConcurrentRetryAsync(DbContextOptions<AppDbContext> options)
    {
        var data = await SeedAsync(options);
        var request = CreateRequest(data);
        await using var firstDb = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        await using var secondDb = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        var firstService = CreateService(firstDb, data.TenantId, new NoOpPosCheckoutTransactionObserver());
        var secondService = CreateService(secondDb, data.TenantId, new NoOpPosCheckoutTransactionObserver());

        var results = await Task.WhenAll(
            firstService.CheckoutAsync(data.CashierId, request),
            secondService.CheckoutAsync(data.CashierId, request));

        Assert.All(results, result => Assert.True(result.Succeeded, result.ErrorMessage));
        Assert.Single(results.Where(x => x.Value!.Replayed));
        Assert.Equal(results[0].Value!.SalesInvoiceId, results[1].Value!.SalesInvoiceId);

        await using var verification = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        Assert.Equal(1, await verification.SalesOrders.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(1, await verification.SalesShipments.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(1, await verification.SalesInvoices.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(1, await verification.CustomerPayments.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(1, await verification.PosCheckoutRecords.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(1, await verification.AuditLogs.CountAsync(x => x.TenantId == data.TenantId));
        Assert.Equal(8m, (await verification.InventoryBalances.SingleAsync(x => x.TenantId == data.TenantId)).QuantityOnHand);
    }

    private static PosCheckoutService CreateService(
        AppDbContext db,
        Guid tenantId,
        IPosCheckoutTransactionObserver observer)
    {
        var tenant = new FixedTenantProvider(tenantId);
        return new PosCheckoutService(
            db,
            tenant,
            new SalesShipmentCommandService(db, tenant, new InventoryMovementPostingService(db)),
            new SalesInvoiceCommandService(db, tenant),
            new CustomerPaymentCommandService(db, tenant),
            new PersistingTestAuditLogger(db),
            observer);
    }

    private static async Task<CheckoutData> SeedAsync(DbContextOptions<AppDbContext> options)
    {
        var data = new CheckoutData();
        await using var db = new AppDbContext(options, new FixedTenantProvider(data.TenantId));
        db.Tenants.Add(new Tenant { Id = data.TenantId, Code = $"POS-{data.TenantId:N}", Name = "POS integration" });
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
        db.ShiftSessions.Add(new ShiftSession
        {
            Id = data.ShiftId,
            TenantId = data.TenantId,
            CashierId = data.CashierId,
            CashierName = "Integration cashier",
            CurrencyCode = "USD",
            Status = ShiftStatus.Open,
        });
        db.Customers.Add(new Customer { Id = data.CustomerId, TenantId = data.TenantId, CustomerNumber = "CUST-1", Name = "Walk-in" });
        db.Warehouses.Add(new Warehouse { Id = data.WarehouseId, TenantId = data.TenantId, Code = "MAIN", Name = "Main" });
        db.Products.Add(new Product { Id = data.ProductId, TenantId = data.TenantId, Sku = "SKU-1", Name = "Widget", SalesPrice = 10m });
        db.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = data.TenantId,
            ProductId = data.ProductId,
            WarehouseId = data.WarehouseId,
            QuantityOnHand = 10m,
        });
        await db.SaveChangesAsync();
        return data;
    }

    private static PosCheckoutRequest CreateRequest(CheckoutData data) => new()
    {
        IdempotencyKey = Guid.NewGuid(),
        ShiftId = data.ShiftId,
        CustomerId = data.CustomerId,
        WarehouseId = data.WarehouseId,
        PaymentMethod = "CASH",
        PaymentAmount = 25m,
#pragma warning disable CS0618
        Lines = [new PosCheckoutLine { ProductId = data.ProductId, Quantity = 2m, UnitPrice = 0.01m }],
#pragma warning restore CS0618
    };

    private sealed class CheckoutData
    {
        public Guid TenantId { get; } = Guid.NewGuid();
        public Guid CashierId { get; } = Guid.NewGuid();
        public Guid ShiftId { get; } = Guid.NewGuid();
        public Guid CustomerId { get; } = Guid.NewGuid();
        public Guid WarehouseId { get; } = Guid.NewGuid();
        public Guid ProductId { get; } = Guid.NewGuid();
    }

    private sealed class ThrowingObserver(PosCheckoutTransactionCheckpoint failureCheckpoint) : IPosCheckoutTransactionObserver
    {
        public Task ReachedAsync(PosCheckoutTransactionCheckpoint checkpoint, CancellationToken cancellationToken)
        {
            if (checkpoint == failureCheckpoint) throw new InjectedCheckoutFailureException(checkpoint);
            return Task.CompletedTask;
        }
    }

    private sealed class InjectedCheckoutFailureException(PosCheckoutTransactionCheckpoint checkpoint)
        : Exception($"Injected failure at {checkpoint}.");

    private sealed class PersistingTestAuditLogger(AppDbContext db) : IAuditLogger
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

internal sealed class PostgreSqlIntegrationFactAttribute : FactAttribute
{
    private const string EnabledVariable = "VEXORIONERP_ALLOW_POSTGRES_INTEGRATION_TESTS";
    private const string ConnectionVariable = "VEXORIONERP_TEST_POSTGRES_CONNECTION_STRING";

    public PostgreSqlIntegrationFactAttribute()
    {
        if (!string.Equals(Environment.GetEnvironmentVariable(EnabledVariable), "true", StringComparison.OrdinalIgnoreCase))
            Skip = $"Set {EnabledVariable}=true and provide a disposable localhost database in {ConnectionVariable}.";
        else
            _ = GetValidatedConnectionString();
    }

    public static string GetValidatedConnectionString()
    {
        var value = Environment.GetEnvironmentVariable(ConnectionVariable)
            ?? throw new InvalidOperationException($"{ConnectionVariable} is required.");
        var builder = new NpgsqlConnectionStringBuilder(value);
        if (builder.Host is not ("localhost" or "127.0.0.1" or "::1"))
            throw new InvalidOperationException("PostgreSQL integration tests only accept a localhost database.");
        if (string.IsNullOrWhiteSpace(builder.Database)
            || !builder.Database.StartsWith("vexorionerp_test", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The disposable database name must start with vexorionerp_test.");
        return builder.ConnectionString;
    }
}
