using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PosRefundServiceTests
{
    private sealed class Fixture
    {
        public Guid TenantId = Guid.NewGuid();
        public Guid CashierId = Guid.NewGuid();
        public Guid ShiftId = Guid.NewGuid();
        public Guid CustomerId = Guid.NewGuid();
        public Guid WarehouseId = Guid.NewGuid();
        public Guid ProductId = Guid.NewGuid();
        public Guid InvoiceId = Guid.NewGuid();
        public Guid InvoiceLineId = Guid.NewGuid();
        public Guid ShipmentId = Guid.NewGuid();
        public AppDbContext Db = null!;
        public PosRefundService Service = null!;
    }

    private static async Task<Fixture> CreateAsync(decimal paidTotal = 20m)
    {
        var fixture = new Fixture();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var tenant = new FixedTenantProvider(fixture.TenantId);
        fixture.Db = new AppDbContext(options, tenant);
        fixture.Db.Tenants.Add(new Tenant { Id = fixture.TenantId, Code = $"POS-{fixture.TenantId:N}", Name = "POS refund test" });
        fixture.Db.Customers.Add(new Customer { Id = fixture.CustomerId, TenantId = fixture.TenantId, CustomerNumber = "C-1", Name = "Walk-in" });
        fixture.Db.Warehouses.Add(new Warehouse { Id = fixture.WarehouseId, TenantId = fixture.TenantId, Code = "MAIN", Name = "Main" });
        fixture.Db.Products.Add(new Product { Id = fixture.ProductId, TenantId = fixture.TenantId, Sku = "SKU-1", Name = "Widget", SalesPrice = 10m });
        fixture.Db.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = fixture.TenantId,
            ProductId = fixture.ProductId,
            WarehouseId = fixture.WarehouseId,
            QuantityOnHand = 8m,
        });
        fixture.Db.ShiftSessions.Add(new ShiftSession
        {
            Id = fixture.ShiftId,
            TenantId = fixture.TenantId,
            CashierId = fixture.CashierId,
            CashierName = "Cashier",
            CurrencyCode = "USD",
            Status = ShiftStatus.Open,
        });
        fixture.Db.SalesShipments.Add(new SalesShipment
        {
            Id = fixture.ShipmentId,
            TenantId = fixture.TenantId,
            ShipmentNumber = "SHP-1",
            WarehouseId = fixture.WarehouseId,
            Status = DocumentStatus.Completed,
        });
        fixture.Db.SalesInvoices.Add(new SalesInvoice
        {
            Id = fixture.InvoiceId,
            TenantId = fixture.TenantId,
            InvoiceNumber = "INV-POS-1",
            CustomerId = fixture.CustomerId,
            SourceSalesShipmentId = fixture.ShipmentId,
            InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrencyCode = "USD",
            Subtotal = 20m,
            GrandTotal = 20m,
            PaidTotal = paidTotal,
            Status = paidTotal == 20m ? InvoiceStatus.Paid : paidTotal > 0m ? InvoiceStatus.PartiallyPaid : InvoiceStatus.Issued,
            Lines =
            [
                new SalesInvoiceLine
                {
                    Id = fixture.InvoiceLineId,
                    TenantId = fixture.TenantId,
                    ProductId = fixture.ProductId,
                    Quantity = 2m,
                    UnitPrice = 10m,
                },
            ],
        });
        var originalPaymentId = paidTotal > 0m ? Guid.NewGuid() : (Guid?)null;
        fixture.Db.PosCheckoutRecords.Add(new PosCheckoutRecord
        {
            TenantId = fixture.TenantId,
            IdempotencyKey = Guid.NewGuid(),
            CashierId = fixture.CashierId,
            ShiftId = fixture.ShiftId,
            RequestHash = new string('A', 64),
            SalesOrderId = Guid.NewGuid(),
            SalesShipmentId = fixture.ShipmentId,
            SalesInvoiceId = fixture.InvoiceId,
            CustomerPaymentId = originalPaymentId,
            ResponseJson = "{}",
        });
        if (paidTotal > 0m)
        {
            fixture.Db.CustomerPayments.Add(new CustomerPayment
            {
                Id = originalPaymentId!.Value,
                TenantId = fixture.TenantId,
                CustomerId = fixture.CustomerId,
                SalesInvoiceId = fixture.InvoiceId,
                PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Amount = paidTotal,
                CurrencyCode = "USD",
                PaymentMethod = "CASH",
            });
        }

        await fixture.Db.SaveChangesAsync();
        fixture.Service = new PosRefundService(fixture.Db, tenant, new NoOpAuditLogger());
        return fixture;
    }

    private static PosRefundRequest Request(Fixture fixture, decimal quantity = 1m, bool returnToStock = true) => new()
    {
        IdempotencyKey = Guid.NewGuid(),
        ShiftId = fixture.ShiftId,
        SalesInvoiceId = fixture.InvoiceId,
        Reason = "Damaged item",
        Lines =
        [
            new PosRefundLineRequest
            {
                SalesInvoiceLineId = fixture.InvoiceLineId,
                Quantity = quantity,
                ReturnToStock = returnToStock,
            },
        ],
    };

    [Fact]
    public async Task Refund_PaidSale_CreatesCreditNoteRefundPaymentAndStockMovement()
    {
        var fixture = await CreateAsync();
        var result = await fixture.Service.RefundAsync(fixture.CashierId, Request(fixture));

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(10m, result.Value!.TotalCreditAmount);
        Assert.Equal(10m, result.Value.RefundAmount);
        Assert.Equal(10m, result.Value.AppliedCreditAmount);
        Assert.Equal("CASH", result.Value.PaymentMethod);
        Assert.Equal(-10m, (await fixture.Db.CustomerPayments.SingleAsync(x => x.Id == result.Value.RefundPaymentId)).Amount);
        Assert.Equal(-10m, (await fixture.Db.SalesInvoices.SingleAsync(x => x.CreditNoteOfInvoiceId == fixture.InvoiceId)).GrandTotal);
        Assert.Equal(10m, (await fixture.Db.SalesInvoices.SingleAsync(x => x.Id == fixture.InvoiceId)).AppliedCreditTotal);
        Assert.Equal(10m, (await fixture.Db.SalesInvoices.SingleAsync(x => x.Id == fixture.InvoiceId)).PaidTotal);
        Assert.Equal(9m, (await fixture.Db.InventoryBalances.SingleAsync()).QuantityOnHand);
        var movement = await fixture.Db.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.PosCustomerReturn, movement.MovementType);
        Assert.Equal(result.Value.RefundId, movement.PosRefundRecordId);
    }

    [Fact]
    public async Task Refund_UnpaidSale_AppliesCreditWithoutCreatingCashPayment()
    {
        var fixture = await CreateAsync(paidTotal: 0m);

        var result = await fixture.Service.RefundAsync(fixture.CashierId, Request(fixture, returnToStock: false));

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(0m, result.Value!.RefundAmount);
        Assert.Equal(10m, result.Value.AppliedCreditAmount);
        Assert.Null(result.Value.RefundPaymentId);
        Assert.Empty(await fixture.Db.CustomerPayments.ToListAsync());
        Assert.Equal(10m, (await fixture.Db.SalesInvoices.SingleAsync(x => x.Id == fixture.InvoiceId)).BalanceDue);
        Assert.Equal(8m, (await fixture.Db.InventoryBalances.SingleAsync()).QuantityOnHand);
    }

    [Fact]
    public async Task Refund_ConcurrentRetryWithSameKeyReplaysWithoutDuplicates()
    {
        var fixture = await CreateAsync();
        var request = Request(fixture);

        var first = await fixture.Service.RefundAsync(fixture.CashierId, request);
        var replay = await fixture.Service.RefundAsync(fixture.CashierId, request);

        Assert.True(first.Succeeded, first.ErrorMessage);
        Assert.True(replay.Succeeded, replay.ErrorMessage);
        Assert.True(replay.Value!.Replayed);
        Assert.Equal(first.Value!.RefundId, replay.Value.RefundId);
        Assert.Single(await fixture.Db.PosRefundRecords.ToListAsync());
        Assert.Single(await fixture.Db.SalesInvoices.Where(x => x.CreditNoteOfInvoiceId == fixture.InvoiceId).ToListAsync());
        Assert.Single(await fixture.Db.InventoryMovements.ToListAsync());
    }

    [Fact]
    public async Task Refund_QuantityAboveRemaining_ReturnsConflict()
    {
        var fixture = await CreateAsync();
        var first = await fixture.Service.RefundAsync(fixture.CashierId, Request(fixture, quantity: 1m));
        Assert.True(first.Succeeded, first.ErrorMessage);

        var secondRequest = Request(fixture, quantity: 2m);
        var second = await fixture.Service.RefundAsync(fixture.CashierId, secondRequest);

        Assert.False(second.Succeeded);
        Assert.Equal(409, second.StatusCode);
        Assert.Equal("pos.refund.quantity_exceeded", second.ErrorCode);
    }

    [Fact]
    public async Task Refund_ChangedPayloadWithSameKey_ReturnsConflict()
    {
        var fixture = await CreateAsync();
        var request = Request(fixture);
        await fixture.Service.RefundAsync(fixture.CashierId, request);
        request.Lines[0].ReturnToStock = false;

        var result = await fixture.Service.RefundAsync(fixture.CashierId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("pos.refund.idempotency_key_reused", result.ErrorCode);
    }

    [Fact]
    public async Task Refund_UnfulfilledSale_ReturnsConflictWithoutCreatingRecords()
    {
        var fixture = await CreateAsync();
        (await fixture.Db.SalesShipments.SingleAsync()).Status = DocumentStatus.Draft;
        await fixture.Db.SaveChangesAsync();

        var result = await fixture.Service.RefundAsync(fixture.CashierId, Request(fixture, returnToStock: false));

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("pos.refund.not_fulfilled", result.ErrorCode);
        Assert.Empty(await fixture.Db.PosRefundRecords.ToListAsync());
        Assert.Empty(await fixture.Db.SalesInvoices.Where(x => x.CreditNoteOfInvoiceId == fixture.InvoiceId).ToListAsync());
    }
}