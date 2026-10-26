using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services.Tests.Inventory;

public class InventoryReportingServiceTests
{
    [Fact]
    public void BuildMovementAuditQuery_TranslatesForPostgreSql()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=translation-only;Username=unused;Password=unused")
            .Options;
        using var dbContext = new AppDbContext(options, new FixedTenantProvider(tenantId));
        var service = new InventoryReportingService(dbContext, new FixedTenantProvider(tenantId));

        var sql = service.BuildMovementAuditQuery(tenantId, new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 26), Guid.NewGuid(), null)
            .Skip(0)
            .Take(50)
            .ToQueryString();

        Assert.Contains("CreatedAtUtc", sql);
        Assert.Contains("ORDER BY", sql);
        Assert.Contains("LIMIT", sql);
    }

    [Fact]
    public async Task GetValuation_ReconcilesCurrentBalancesAgainstNetMovementLedger()
    {
        var tenantId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "VAL-1", Name = "Valuation product", StandardCost = 2.5m });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 6m, QuantityReserved = 2m });
        dbContext.InventoryMovements.AddRange(
            new InventoryMovement { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, MovementType = InventoryMovementType.PurchaseReceipt, Quantity = 8m, QuantityOnHandDelta = 8m, ReferenceNumber = "RCV-1" },
            new InventoryMovement { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, MovementType = InventoryMovementType.SalesShipment, Quantity = 1m, QuantityOnHandDelta = -1m, ReferenceNumber = "SHIP-1" });
        await dbContext.SaveChangesAsync();

        var service = new InventoryReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetValuationAsync(null);

        Assert.True(result.Succeeded);
        Assert.Equal(15m, result.Value!.TotalEstimatedValue);
        Assert.Equal(0, result.Value.ReconciledItemCount);
        Assert.Equal(1, result.Value.UnreconciledItemCount);
        var item = Assert.Single(result.Value.Items);
        Assert.Equal(6m, item.QuantityOnHand);
        Assert.Equal(7m, item.LedgerNetQuantity);
        Assert.Equal(-1m, item.BalanceToLedgerVariance);
    }

    [Fact]
    public async Task GetMovementAudit_FiltersByDateAndWarehouseAndAppliesPaging()
    {
        var tenantId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var otherWarehouseId = Guid.NewGuid();
        var start = new DateOnly(2026, 10, 1);
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "MOV-1", Name = "Movement product" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main warehouse" },
            new Warehouse { Id = otherWarehouseId, TenantId = tenantId, Code = "ALT", Name = "Alternate warehouse" });
        dbContext.InventoryMovements.AddRange(
            new InventoryMovement { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, CreatedAtUtc = new DateTime(2026, 10, 2, 9, 0, 0, DateTimeKind.Utc), MovementType = InventoryMovementType.PurchaseReceipt, Quantity = 1m, QuantityOnHandDelta = 1m, ReferenceNumber = "RCV-1" },
            new InventoryMovement { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, CreatedAtUtc = new DateTime(2026, 10, 3, 9, 0, 0, DateTimeKind.Utc), MovementType = InventoryMovementType.PurchaseReceipt, Quantity = 2m, QuantityOnHandDelta = 2m, ReferenceNumber = "RCV-2" },
            new InventoryMovement { TenantId = tenantId, ProductId = productId, WarehouseId = otherWarehouseId, CreatedAtUtc = new DateTime(2026, 10, 3, 10, 0, 0, DateTimeKind.Utc), MovementType = InventoryMovementType.PurchaseReceipt, Quantity = 3m, QuantityOnHandDelta = 3m, ReferenceNumber = "RCV-3" });
        await dbContext.SaveChangesAsync();

        var service = new InventoryReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetMovementAuditAsync(start, start.AddDays(2), warehouseId, null, 0, 1);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.TotalCount);
        var movement = Assert.Single(result.Value.Items);
        Assert.Equal("RCV-2", movement.ReferenceNumber);
        Assert.Equal(warehouseId, movement.WarehouseId);
        Assert.Equal("PurchaseReceipt", movement.MovementType);
    }

    [Fact]
    public async Task GetMovementAudit_RejectsInvalidDateRangesAndPageSizes()
    {
        var tenantId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new InventoryReportingService(dbContext, new FixedTenantProvider(tenantId));

        var invalidDates = await service.GetMovementAuditAsync(new DateOnly(2026, 10, 2), new DateOnly(2026, 10, 1), null, null, 0, 50);
        var invalidPageSize = await service.GetMovementAuditAsync(null, null, null, null, 0, 501);

        Assert.False(invalidDates.Succeeded);
        Assert.Equal(400, invalidDates.StatusCode);
        Assert.False(invalidPageSize.Succeeded);
        Assert.Equal(400, invalidPageSize.StatusCode);
    }

    [Fact]
    public async Task GetReorderRecommendations_UsesAvailableStockOnlyInActiveWarehouses()
    {
        var tenantId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var inactiveWarehouseId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "REO-1", Name = "Reorder product", ReorderLevel = 8m });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main warehouse", IsActive = true },
            new Warehouse { Id = inactiveWarehouseId, TenantId = tenantId, Code = "CLOSED", Name = "Closed warehouse", IsActive = false });
        dbContext.InventoryBalances.AddRange(
            new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 6m, QuantityReserved = 2m },
            new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = inactiveWarehouseId, QuantityOnHand = 100m, QuantityReserved = 0m });
        await dbContext.SaveChangesAsync();

        var service = new InventoryReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetReorderRecommendationsAsync();

        Assert.True(result.Succeeded);
        var recommendation = Assert.Single(result.Value!.Items);
        Assert.Equal(4m, recommendation.ActiveWarehouseAvailable);
        Assert.Equal(8m, recommendation.ReorderLevel);
        Assert.Equal(4m, recommendation.SuggestedReorderQuantity);
    }
}