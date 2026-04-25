using VexorionERP.Contracts.Purchasing.Receipts;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class PurchaseReceiptCommandServiceTests
{
    private static (Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId) SeedIds()
        => (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    [Fact]
    public async Task CreateReceipt_CreatesDraftReceipt()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var result = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5m, UnitCost = 10m }],
        });

        Assert.True(result.Succeeded);
        Assert.Equal(DocumentStatus.Draft, result.Value!.Status);
        Assert.Single(result.Value.Lines);
        Assert.Equal(5m, result.Value.Lines[0].ReceivedQuantity);
        Assert.Null(result.Value.PostedAtUtc);
    }

    [Fact]
    public async Task PostReceipt_PartialReceipt_UpdatesOrderLineAndSetsPartialStatus()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 6m, UnitCost = 10m }],
        });

        Assert.True(created.Succeeded);

        var posted = await service.PostAsync(created.Value!.Id);

        Assert.True(posted.Succeeded);
        Assert.Equal(DocumentStatus.Completed, posted.Value!.Status);
        Assert.NotNull(posted.Value.PostedAtUtc);

        // Inventory movement created
        var movement = db.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.PurchaseReceipt, movement.MovementType);
        Assert.Equal(6m, movement.QuantityOnHandDelta);

        // Balance updated
        var balance = db.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);

        // Order line ReceivedQuantity updated
        var orderLine = db.PurchaseOrderLines.Single();
        Assert.Equal(6m, orderLine.ReceivedQuantity);

        // Order status = PartiallyProcessed (6 of 10 received)
        var order = db.PurchaseOrders.Single();
        Assert.Equal(DocumentStatus.PartiallyProcessed, order.Status);
    }

    [Fact]
    public async Task PostReceipt_FullReceipt_SetsOrderCompleted()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 10m, UnitCost = 10m }],
        });

        Assert.True(created.Succeeded);

        var posted = await service.PostAsync(created.Value!.Id);

        Assert.True(posted.Succeeded);
        var order = db.PurchaseOrders.Single();
        Assert.Equal(DocumentStatus.Completed, order.Status);
        Assert.Equal(10m, db.InventoryBalances.Single().QuantityOnHand);
    }

    [Fact]
    public async Task CreateReceipt_OverReceipt_IsRejected()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m, alreadyReceived: 8m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var result = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5m, UnitCost = 10m }],
        });

        Assert.False(result.Succeeded);
        Assert.Contains("Over-receipt", result.ErrorMessage);
    }

    [Fact]
    public async Task DeleteReceipt_DraftReceipt_Succeeds()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 3m, UnitCost = 10m }],
        });

        Assert.True(created.Succeeded);

        var deleted = await service.DeleteAsync(created.Value!.Id);
        Assert.True(deleted.Succeeded);

        var receipt = db.PurchaseReceipts.Single();
        Assert.False(receipt.IsActive);
    }

    [Fact]
    public async Task DeleteReceipt_PostedReceipt_IsRejected()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 10m, UnitCost = 10m }],
        });

        await service.PostAsync(created.Value!.Id);

        var deleted = await service.DeleteAsync(created.Value!.Id);
        Assert.False(deleted.Succeeded);
    }

    [Fact]
    public async Task PostReceipt_TwoPartialReceipts_CumulativeReceivedQuantity()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        // First partial receipt
        var rcv1 = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 1),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 4m, UnitCost = 10m }],
        });
        await service.PostAsync(rcv1.Value!.Id);

        // Second partial receipt
        var rcv2 = await service.CreateAsync(new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "RCV-002",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 5, 2),
            Lines = [new CreatePurchaseReceiptLineRequest { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 4m, UnitCost = 10m }],
        });
        await service.PostAsync(rcv2.Value!.Id);

        var orderLine = db.PurchaseOrderLines.Single();
        Assert.Equal(8m, orderLine.ReceivedQuantity);

        var balance = db.InventoryBalances.Single();
        Assert.Equal(8m, balance.QuantityOnHand);

        var order = db.PurchaseOrders.Single();
        Assert.Equal(DocumentStatus.PartiallyProcessed, order.Status);
    }

    private static async Task SeedOrderAsync(
        Database.AppDbContext db,
        Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId,
        decimal orderQty, decimal alreadyReceived = 0m)
    {
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        db.Suppliers.Add(new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            SupplierId = db.Suppliers.Local.First().Id,
            WarehouseId = warehouseId,
            OrderNumber = "PO-001",
            OrderDate = new DateOnly(2026, 4, 25),
            ExpectedReceiptDate = new DateOnly(2026, 5, 1),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            TotalAmount = orderQty * 10m,
            Lines =
            [
                new PurchaseOrderLine
                {
                    Id = lineId,
                    TenantId = tenantId,
                    PurchaseOrderId = orderId,
                    ProductId = productId,
                    Quantity = orderQty,
                    UnitCost = 10m,
                    ReceivedQuantity = alreadyReceived,
                }
            ]
        });

        await db.SaveChangesAsync();
    }
}
