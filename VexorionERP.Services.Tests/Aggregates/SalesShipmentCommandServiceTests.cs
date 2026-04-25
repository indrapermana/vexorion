using VexorionERP.Contracts.Sales.Shipments;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class SalesShipmentCommandServiceTests
{
    private static (Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId) SeedIds()
        => (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    [Fact]
    public async Task CreateShipment_CreatesDraftShipment()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var result = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5m, UnitPrice = 20m }],
        });

        Assert.True(result.Succeeded);
        Assert.Equal(DocumentStatus.Draft, result.Value!.Status);
        Assert.Single(result.Value.Lines);
        Assert.Equal(5m, result.Value.Lines[0].ShippedQuantity);
        Assert.Null(result.Value.PostedAtUtc);
    }

    [Fact]
    public async Task PostShipment_PartialShipment_UpdatesOrderLineAndSetsPartialStatus()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 6m, UnitPrice = 20m }],
        });

        Assert.True(created.Succeeded);

        var posted = await service.PostAsync(created.Value!.Id);

        Assert.True(posted.Succeeded);
        Assert.Equal(DocumentStatus.Completed, posted.Value!.Status);
        Assert.NotNull(posted.Value.PostedAtUtc);

        // Inventory movement
        var movement = db.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.SalesShipment, movement.MovementType);
        Assert.Equal(-6m, movement.QuantityOnHandDelta);

        // Balance reduced
        var balance = db.InventoryBalances.Single();
        Assert.Equal(4m, balance.QuantityOnHand);

        // Order line ShippedQuantity updated
        var orderLine = db.SalesOrderLines.Single();
        Assert.Equal(6m, orderLine.ShippedQuantity);

        // Order status = PartiallyProcessed
        var order = db.SalesOrders.Single();
        Assert.Equal(DocumentStatus.PartiallyProcessed, order.Status);
    }

    [Fact]
    public async Task PostShipment_FullShipment_SetsOrderCompleted()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 10m, UnitPrice = 20m }],
        });

        var posted = await service.PostAsync(created.Value!.Id);

        Assert.True(posted.Succeeded);
        var order = db.SalesOrders.Single();
        Assert.Equal(DocumentStatus.Completed, order.Status);
        Assert.Equal(0m, db.InventoryBalances.Single().QuantityOnHand);
    }

    [Fact]
    public async Task CreateShipment_OverShipment_IsRejected()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m, alreadyShipped: 8m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var result = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5m, UnitPrice = 20m }],
        });

        Assert.False(result.Succeeded);
        Assert.Contains("Over-shipment", result.ErrorMessage);
    }

    [Fact]
    public async Task PostShipment_InsufficientStock_IsRejected()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 3m); // only 3 in stock

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5m, UnitPrice = 20m }],
        });

        Assert.True(created.Succeeded); // creation is fine (no stock check at draft)

        var posted = await service.PostAsync(created.Value!.Id);

        Assert.False(posted.Succeeded);
        Assert.Contains("Insufficient", posted.ErrorMessage);
    }

    [Fact]
    public async Task DeleteShipment_DraftShipment_Succeeds()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var created = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 3m, UnitPrice = 20m }],
        });

        Assert.True(created.Succeeded);

        var deleted = await service.DeleteAsync(created.Value!.Id);
        Assert.True(deleted.Succeeded);

        var shipment = db.SalesShipments.Single();
        Assert.False(shipment.IsActive);
    }

    [Fact]
    public async Task PostShipment_TwoPartialShipments_CumulativeShippedQuantity()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        await SeedOrderAsync(db, tenantId, orderId, productId, warehouseId, lineId, orderQty: 10m);
        await SeedInventoryBalance(db, tenantId, productId, warehouseId, onHand: 10m);

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(db));

        var shp1 = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 1),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 4m, UnitPrice = 20m }],
        });
        await service.PostAsync(shp1.Value!.Id);

        var shp2 = await service.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHP-002",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 5, 2),
            Lines = [new CreateSalesShipmentLineRequest { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 4m, UnitPrice = 20m }],
        });
        await service.PostAsync(shp2.Value!.Id);

        var orderLine = db.SalesOrderLines.Single();
        Assert.Equal(8m, orderLine.ShippedQuantity);

        var balance = db.InventoryBalances.Single();
        Assert.Equal(2m, balance.QuantityOnHand);

        var order = db.SalesOrders.Single();
        Assert.Equal(DocumentStatus.PartiallyProcessed, order.Status);
    }

    private static async Task SeedOrderAsync(
        Database.AppDbContext db,
        Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId,
        decimal orderQty, decimal alreadyShipped = 0m)
    {
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        db.Customers.Add(new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = db.Customers.Local.First().Id,
            WarehouseId = warehouseId,
            OrderNumber = "SO-001",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 5, 1),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            TotalAmount = orderQty * 20m,
            Lines =
            [
                new SalesOrderLine
                {
                    Id = lineId,
                    TenantId = tenantId,
                    SalesOrderId = orderId,
                    ProductId = productId,
                    Quantity = orderQty,
                    UnitPrice = 20m,
                    DiscountAmount = 0m,
                    ShippedQuantity = alreadyShipped,
                }
            ]
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedInventoryBalance(
        Database.AppDbContext db,
        Guid tenantId, Guid productId, Guid warehouseId, decimal onHand)
    {
        db.InventoryBalances.Add(new InventoryBalance
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = onHand,
            QuantityReserved = 0m,
        });
        await db.SaveChangesAsync();
    }
}
