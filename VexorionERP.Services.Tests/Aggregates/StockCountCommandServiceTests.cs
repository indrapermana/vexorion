using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Services;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class StockCountCommandServiceTests
{
    [Fact]
    public async Task CompletingStockCount_WithPositiveVariance_PostsIncreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-SC-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 3m,
            QuantityReserved = 0m,
        });
        dbContext.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-1",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockCountLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockCountId = stockCountId,
                    ProductId = productId,
                    SystemQuantity = 3m,
                    CountedQuantity = 5m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockCountCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(stockCountId, new UpdateStockCountRequest
        {
            CountNumber = "SC-1",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(5m, balance.QuantityOnHand);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.StockCountVarianceIncrease, movement.MovementType);
        Assert.Equal(2m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task CompletingStockCount_WithNegativeVariance_PostsDecreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-SC-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 10m,
            QuantityReserved = 0m,
        });
        dbContext.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-2",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockCountLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockCountId = stockCountId,
                    ProductId = productId,
                    SystemQuantity = 10m,
                    CountedQuantity = 6m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockCountCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(stockCountId, new UpdateStockCountRequest
        {
            CountNumber = "SC-2",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.StockCountVarianceDecrease, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task CancellingPostedStockCount_ReversesVarianceMovements()
    {
        var tenantId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-SC-3", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 10m,
            QuantityReserved = 0m,
        });
        dbContext.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-3",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockCountLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockCountId = stockCountId,
                    ProductId = productId,
                    SystemQuantity = 10m,
                    CountedQuantity = 7m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockCountCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var completeResult = await service.UpdateAsync(stockCountId, new UpdateStockCountRequest
        {
            CountNumber = "SC-3",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(stockCountId, new UpdateStockCountRequest
        {
            CountNumber = "SC-3",
            WarehouseId = warehouseId,
            CountDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Notes = null,
        });

        Assert.True(cancelResult.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(10m, balance.QuantityOnHand);
        Assert.Equal(2, dbContext.InventoryMovements.Count());
        Assert.Contains(dbContext.InventoryMovements, x => x.MovementType == InventoryMovementType.StockCountVarianceDecrease && x.QuantityOnHandDelta == -3m);
        Assert.Contains(dbContext.InventoryMovements, x => x.MovementType == InventoryMovementType.StockCountVarianceIncrease && x.QuantityOnHandDelta == 3m);
    }
}