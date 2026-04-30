using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class StockCountLineCommandServiceTests
{
    private static (AppDbContext db, StockCountLineCommandService svc, Guid tenantId) Build(string? dbName = null)
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, dbName ?? Guid.NewGuid().ToString());
        var svc = new StockCountLineCommandService(db, new FixedTenantProvider(tenantId));
        return (db, svc, tenantId);
    }

    private static CreateStockCountLineRequest ValidCreate(Guid productId) => new()
    {
        ProductId = productId,
        SystemQuantity = 10,
        CountedQuantity = 9,
    };

    private static UpdateStockCountLineRequest ValidUpdate(Guid productId) => new()
    {
        ProductId = productId,
        SystemQuantity = 12,
        CountedQuantity = 11,
    };

    [Fact]
    public async Task Create_StockCountNotFound_Returns404()
    {
        var (db, svc, _) = Build();
        var result = await svc.CreateAsync(Guid.NewGuid(), ValidCreate(Guid.NewGuid()));
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Create_NonDraftStockCount_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var stockCountId = Guid.NewGuid();
        db.StockCounts.Add(new StockCount { Id = stockCountId, TenantId = tenantId, CountNumber = "SC-001", WarehouseId = Guid.NewGuid(), CountDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = DocumentStatus.Completed });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(stockCountId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_ProductNotFound_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var stockCountId = Guid.NewGuid();
        db.StockCounts.Add(new StockCount { Id = stockCountId, TenantId = tenantId, CountNumber = "SC-001", WarehouseId = Guid.NewGuid(), CountDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = DocumentStatus.Draft });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(stockCountId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Equal("Product not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task Create_DuplicateProductLine_Returns409()
    {
        var (db, svc, tenantId) = Build();
        var productId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-001",
            WarehouseId = Guid.NewGuid(),
            CountDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockCountLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = productId, SystemQuantity = 1, CountedQuantity = 1, IsActive = true }
            ]
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(stockCountId, ValidCreate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesLine()
    {
        var (db, svc, tenantId) = Build();
        var productId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockCounts.Add(new StockCount { Id = stockCountId, TenantId = tenantId, CountNumber = "SC-001", WarehouseId = Guid.NewGuid(), CountDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = DocumentStatus.Draft });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(stockCountId, ValidCreate(productId));

        Assert.True(result.Succeeded);
        Assert.Single(db.StockCountLines);
    }

    [Fact]
    public async Task Update_LineNotFound_Returns404()
    {
        var (db, svc, tenantId) = Build();
        var productId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockCounts.Add(new StockCount { Id = stockCountId, TenantId = tenantId, CountNumber = "SC-001", WarehouseId = Guid.NewGuid(), CountDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = DocumentStatus.Draft });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(stockCountId, Guid.NewGuid(), ValidUpdate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesLine()
    {
        var (db, svc, tenantId) = Build();
        var productId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-001",
            WarehouseId = Guid.NewGuid(),
            CountDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines = [new StockCountLine { Id = lineId, TenantId = tenantId, ProductId = productId, SystemQuantity = 2, CountedQuantity = 1 }]
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(stockCountId, lineId, ValidUpdate(productId));

        Assert.True(result.Succeeded);
        var line = db.StockCountLines.Single(x => x.Id == lineId);
        Assert.Equal(12, line.SystemQuantity);
        Assert.Equal(11, line.CountedQuantity);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesLine()
    {
        var (db, svc, tenantId) = Build();
        var productId = Guid.NewGuid();
        var stockCountId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockCounts.Add(new StockCount
        {
            Id = stockCountId,
            TenantId = tenantId,
            CountNumber = "SC-001",
            WarehouseId = Guid.NewGuid(),
            CountDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines = [new StockCountLine { Id = lineId, TenantId = tenantId, ProductId = productId, SystemQuantity = 2, CountedQuantity = 1 }]
        });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(stockCountId, lineId);

        Assert.True(result.Succeeded);
        Assert.Empty(db.StockCountLines);
    }
}
