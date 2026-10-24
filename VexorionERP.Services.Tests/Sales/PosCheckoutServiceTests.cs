using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PosCheckoutServiceTests
{
    private sealed class Fixture
    {
        public Guid TenantId = Guid.NewGuid();
        public Guid CashierId = Guid.NewGuid();
        public Guid ShiftId = Guid.NewGuid();
        public Guid CustomerId = Guid.NewGuid();
        public Guid WarehouseId = Guid.NewGuid();
        public Guid ProductId = Guid.NewGuid();
        public AppDbContext Db = null!;
        public PosCheckoutService Service = null!;
    }

    private static async Task<Fixture> CreateAsync(decimal onHand = 10m, ShiftStatus shiftStatus = ShiftStatus.Open)
    {
        var f = new Fixture();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var tenant = new FixedTenantProvider(f.TenantId);
        f.Db = new AppDbContext(options, tenant);

        f.Db.ShiftSessions.Add(new ShiftSession { Id = f.ShiftId, TenantId = f.TenantId, CashierId = f.CashierId, CashierName = "Cashier", CurrencyCode = "USD", Status = shiftStatus });
        f.Db.Customers.Add(new Customer { Id = f.CustomerId, TenantId = f.TenantId, CustomerNumber = "CUST-1", Name = "Walk-in" });
        f.Db.Warehouses.Add(new Warehouse { Id = f.WarehouseId, TenantId = f.TenantId, Code = "MAIN", Name = "Main" });
        f.Db.Products.Add(new Product { Id = f.ProductId, TenantId = f.TenantId, Sku = "SKU-1", Name = "Widget", SalesPrice = 10m });
        f.Db.InventoryBalances.Add(new InventoryBalance { TenantId = f.TenantId, ProductId = f.ProductId, WarehouseId = f.WarehouseId, QuantityOnHand = onHand });
        await f.Db.SaveChangesAsync();

        var inventory = new InventoryMovementPostingService(f.Db);
        f.Service = new PosCheckoutService(
            f.Db,
            tenant,
            new SalesShipmentCommandService(f.Db, tenant, inventory),
            new SalesInvoiceCommandService(f.Db, tenant),
            new CustomerPaymentCommandService(f.Db, tenant),
            new NoOpAuditLogger(),
            new NoOpPosCheckoutTransactionObserver());
        return f;
    }

    private static PosCheckoutRequest Request(Fixture f, decimal quantity = 2m, decimal payment = 25m, bool delivery = false) => new()
    {
        IdempotencyKey = Guid.NewGuid(),
        ShiftId = f.ShiftId,
        CustomerId = f.CustomerId,
        WarehouseId = f.WarehouseId,
        IsDelivery = delivery,
        PaymentMethod = "CASH",
        PaymentAmount = payment,
#pragma warning disable CS0618 // Compatibility price is deliberately populated to prove the server ignores it.
        Lines = [new PosCheckoutLine { ProductId = f.ProductId, Quantity = quantity, UnitPrice = 10m, DiscountAmount = 0m }],
#pragma warning restore CS0618
    };

    [Fact]
    public async Task Checkout_HappyPath_CreatesPaidInvoiceDeductsStockAndReturnsChange()
    {
        var f = await CreateAsync();

        var result = await f.Service.CheckoutAsync(f.CashierId, Request(f));

        Assert.True(result.Succeeded, result.ErrorMessage);
        var response = result.Value!;
        Assert.False(response.Replayed);
        Assert.Equal(20m, response.GrandTotal);
        Assert.Equal(20m, response.AmountApplied);
        Assert.Equal(5m, response.ChangeDue);
        Assert.NotNull(response.CustomerPaymentId);

        var invoice = await f.Db.SalesInvoices.SingleAsync();
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.Equal(response.SalesShipmentId, invoice.SourceSalesShipmentId);
        Assert.Equal(DocumentStatus.Completed, (await f.Db.SalesOrders.SingleAsync()).Status);
        Assert.Equal(8m, (await f.Db.InventoryBalances.SingleAsync()).QuantityOnHand);
        Assert.Single(await f.Db.PosCheckoutRecords.ToListAsync());
    }

    [Fact]
    public async Task Checkout_UsesCurrentServerPriceForDocumentsAndResponse()
    {
        var f = await CreateAsync();
        var product = await f.Db.Products.SingleAsync();
        product.SalesPrice = 12.50m;
        await f.Db.SaveChangesAsync();
        var request = Request(f, payment: 30m);
#pragma warning disable CS0618 // Simulate a tampered/stale browser price.
        request.Lines[0].UnitPrice = 0.01m;
#pragma warning restore CS0618

        var result = await f.Service.CheckoutAsync(f.CashierId, request);

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(25m, result.Value!.GrandTotal);
        Assert.Equal(12.50m, Assert.Single(result.Value.Lines).UnitPrice);
        Assert.Equal(25m, (await f.Db.SalesOrders.SingleAsync()).TotalAmount);
        Assert.Equal(12.50m, (await f.Db.SalesOrderLines.SingleAsync()).UnitPrice);
    }

    [Fact]
    public async Task Checkout_DiscountAboveServerCalculatedLineTotal_IsRejected()
    {
        var f = await CreateAsync();
        var request = Request(f);
        request.Lines[0].DiscountAmount = 20.01m;

        var result = await f.Service.CheckoutAsync(f.CashierId, request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.Empty(await f.Db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Checkout_ReplayWithSameKey_ReturnsOriginalWithoutDuplicates()
    {
        var f = await CreateAsync();
        var request = Request(f);

        var first = await f.Service.CheckoutAsync(f.CashierId, request);
        var second = await f.Service.CheckoutAsync(f.CashierId, request);

        Assert.True(second.Succeeded);
        Assert.True(second.Value!.Replayed);
        Assert.Equal(first.Value!.SalesInvoiceId, second.Value.SalesInvoiceId);
        Assert.Equal(1, await f.Db.SalesInvoices.CountAsync());
        Assert.Equal(1, await f.Db.SalesOrders.CountAsync());
        Assert.Equal(1, await f.Db.CustomerPayments.CountAsync());
        Assert.Equal(8m, (await f.Db.InventoryBalances.SingleAsync()).QuantityOnHand);
    }

    [Fact]
    public async Task Checkout_SameKeyDifferentPayload_ReturnsConflict()
    {
        var f = await CreateAsync();
        var request = Request(f);
        await f.Service.CheckoutAsync(f.CashierId, request);

        request.Lines[0].Quantity = 3m;
        var result = await f.Service.CheckoutAsync(f.CashierId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("pos.idempotency_key_reused", result.ErrorCode);
    }

    [Fact]
    public async Task Checkout_InsufficientStock_ReturnsStockConflictAndNoRecord()
    {
        var f = await CreateAsync(onHand: 1m);

        var result = await f.Service.CheckoutAsync(f.CashierId, Request(f));

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("inventory.insufficient_stock", result.ErrorCode);
        Assert.Empty(await f.Db.PosCheckoutRecords.ToListAsync());
    }

    [Fact]
    public async Task Checkout_ClosedShift_ReturnsConflict()
    {
        var f = await CreateAsync(shiftStatus: ShiftStatus.Closed);

        var result = await f.Service.CheckoutAsync(f.CashierId, Request(f));

        Assert.Equal(409, result.StatusCode);
        Assert.Equal("pos.shift_closed", result.ErrorCode);
    }

    [Fact]
    public async Task Checkout_ShiftOwnedByAnotherCashier_ReturnsNotFound()
    {
        var f = await CreateAsync();

        var result = await f.Service.CheckoutAsync(Guid.NewGuid(), Request(f));

        Assert.Equal(404, result.StatusCode);
        Assert.Equal("pos.shift_not_found", result.ErrorCode);
    }

    [Fact]
    public async Task Checkout_PaymentBelowTotal_IsRejectedForCounterSale()
    {
        var f = await CreateAsync();

        var result = await f.Service.CheckoutAsync(f.CashierId, Request(f, payment: 5m));

        Assert.Equal(400, result.StatusCode);
        Assert.Equal("pos.payment_insufficient", result.ErrorCode);
        Assert.Empty(await f.Db.SalesOrders.ToListAsync());
    }

    [Fact]
    public async Task Checkout_Delivery_DoesNotDeductStockAndAllowsPartialPayment()
    {
        var f = await CreateAsync();

        var result = await f.Service.CheckoutAsync(f.CashierId, Request(f, payment: 5m, delivery: true));

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(5m, result.Value!.AmountApplied);
        Assert.Equal(10m, (await f.Db.InventoryBalances.SingleAsync()).QuantityOnHand);
        Assert.Equal(InvoiceStatus.PartiallyPaid, (await f.Db.SalesInvoices.SingleAsync()).Status);
    }

    [Fact]
    public async Task Checkout_InvalidLines_ReturnsValidationFailure()
    {
        var f = await CreateAsync();
        var request = Request(f);
        request.Lines[0].Quantity = 0m;

        var result = await f.Service.CheckoutAsync(f.CashierId, request);

        Assert.NotNull(result.Validation);
    }
}
