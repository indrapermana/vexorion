using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class SalesOrderCommandServiceTests
{
    [Fact]
    public async Task SalesOrderConfirm_ReservesInventory()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 10m, QuantityReserved = 0m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-RES-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-RES-1",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(10m, balance.QuantityOnHand);
        Assert.Equal(4m, balance.QuantityReserved);
        Assert.Equal(6m, balance.QuantityAvailable);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.SalesReservation, movement.MovementType);
        Assert.Equal(4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task SalesOrderConfirm_FailsWhenStockIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 3m, QuantityReserved = 0m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-RES-2",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-RES-2",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(0, dbContext.InventoryMovements.Count());
        Assert.Equal(0m, dbContext.InventoryBalances.Single().QuantityReserved);
    }

    [Fact]
    public async Task SalesOrderComplete_ConsumesReservedInventory()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 10m, QuantityReserved = 4m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-SHIP-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-SHIP-1",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Completed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.SalesShipment, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
        Assert.Equal(-4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task SalesOrderLineCreate_FailsWhenOrderIsNotDraft()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-LOCK-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD"
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(orderId, new CreateSalesOrderLineRequest
        {
            ProductId = productId,
            Quantity = 1m,
            UnitPrice = 10m,
            DiscountAmount = 0m
        });

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task SalesOrderLineCreate_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            OrderNumber = "SO-1",
            OrderDate = new DateOnly(2026, 4, 16),
            RequiredDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            TotalAmount = 20m,
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 2m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(orderId, new CreateSalesOrderLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitPrice = 5m,
            DiscountAmount = 1m
        });

        Assert.True(result.Succeeded);
        Assert.Equal(34m, dbContext.SalesOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task SalesOrderLineDelete_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var lineToDeleteId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            OrderNumber = "SO-2",
            OrderDate = new DateOnly(2026, 4, 16),
            RequiredDate = new DateOnly(2026, 4, 20),
            CurrencyCode = "USD",
            TotalAmount = 34m,
            Lines =
            [
                new SalesOrderLine { Id = lineToDeleteId, TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 3m, UnitPrice = 5m, DiscountAmount = 1m },
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 2m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.DeleteAsync(orderId, lineToDeleteId);

        Assert.True(result.Succeeded);
        Assert.Equal(20m, dbContext.SalesOrders.Single().TotalAmount);
    }
}
