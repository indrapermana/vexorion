using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class InventoryBalanceCommandServiceTests
{
    static InventoryBalanceCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, InventoryBalanceCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new InventoryBalanceCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    private static (AppDbContext db, InventoryBalanceCommandService svc) BuildNoTenant(string? dbName = null)
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), dbName ?? Guid.NewGuid().ToString());
        var svc = new InventoryBalanceCommandService(new FixedTenantProvider(null));
        return (db, svc);
    }

    private static CreateInventoryBalanceRequest ValidCreate(Guid productId, Guid warehouseId) => new()
    {
        ProductId = productId,
        WarehouseId = warehouseId,
        QuantityOnHand = 10,
        QuantityReserved = 2,
    };

    private static UpdateInventoryBalanceRequest ValidUpdate(Guid productId, Guid warehouseId) => new()
    {
        ProductId = productId,
        WarehouseId = warehouseId,
        QuantityOnHand = 20,
        QuantityReserved = 5,
        IsActive = true,
    };

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var (db, svc) = BuildNoTenant();
        var result = await svc.CreateAsync(ValidCreate(Guid.NewGuid(), Guid.NewGuid()), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_QuantityReservedGreaterThanOnHand_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var request = new CreateInventoryBalanceRequest
        {
            ProductId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            QuantityOnHand = 1,
            QuantityReserved = 2,
        };

        var result = await svc.CreateAsync(request, db);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.True(result.Validation.Errors.ContainsKey(nameof(CreateInventoryBalanceRequest.QuantityReserved)));
    }

    [Fact]
    public async Task Create_ProductNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var warehouseId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(Guid.NewGuid(), warehouseId), db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Product not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task Create_WarehouseNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(productId, Guid.NewGuid()), db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Warehouse not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task Create_DuplicateProductWarehouse_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });
        db.InventoryBalances.Add(new InventoryBalance
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 5,
            QuantityReserved = 1,
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(productId, warehouseId), db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesInventoryBalance()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate(productId, warehouseId), db);

        Assert.True(result.Succeeded);
        Assert.Equal(1, db.InventoryBalances.Count());
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(Guid.NewGuid(), ValidUpdate(productId, warehouseId), db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateProductWarehouse_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        var w1 = Guid.NewGuid();
        var w2 = Guid.NewGuid();
        db.Products.AddRange(
            new Product { Id = p1, TenantId = tenantId, Sku = "SKU-001", Name = "P1", UnitOfMeasure = "EA" },
            new Product { Id = p2, TenantId = tenantId, Sku = "SKU-002", Name = "P2", UnitOfMeasure = "EA" });
        db.Warehouses.AddRange(
            new Warehouse { Id = w1, TenantId = tenantId, Code = "WH1", Name = "Main" },
            new Warehouse { Id = w2, TenantId = tenantId, Code = "WH2", Name = "Secondary" });

        var b1 = Guid.NewGuid();
        db.InventoryBalances.AddRange(
            new InventoryBalance { Id = b1, TenantId = tenantId, ProductId = p1, WarehouseId = w1, QuantityOnHand = 10, QuantityReserved = 1 },
            new InventoryBalance { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p2, WarehouseId = w2, QuantityOnHand = 10, QuantityReserved = 1 });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(b1, ValidUpdate(p2, w2), db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesInventoryBalance()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });

        var balanceId = Guid.NewGuid();
        db.InventoryBalances.Add(new InventoryBalance
        {
            Id = balanceId,
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 5,
            QuantityReserved = 1,
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(balanceId, ValidUpdate(productId, warehouseId), db);

        Assert.True(result.Succeeded);
        var updated = db.InventoryBalances.Single(x => x.Id == balanceId);
        Assert.Equal(20, updated.QuantityOnHand);
        Assert.Equal(5, updated.QuantityReserved);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesInventoryBalance()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH1", Name = "Main" });

        var balanceId = Guid.NewGuid();
        db.InventoryBalances.Add(new InventoryBalance
        {
            Id = balanceId,
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 5,
            QuantityReserved = 1,
        });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(balanceId, db);

        Assert.True(result.Succeeded);
        Assert.Empty(db.InventoryBalances);
    }
}
