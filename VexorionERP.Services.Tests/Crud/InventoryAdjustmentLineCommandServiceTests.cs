using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class InventoryAdjustmentLineCommandServiceTests
{
    private static (AppDbContext db, InventoryAdjustmentLineCommandService svc, Guid tenantId) Build(string? dbName = null)
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, dbName ?? Guid.NewGuid().ToString());
        var svc = new InventoryAdjustmentLineCommandService(db, new FixedTenantProvider(tenantId));
        return (db, svc, tenantId);
    }

    private static CreateInventoryAdjustmentLineRequest ValidCreate(Guid productId) => new()
    {
        ProductId = productId,
        QuantityDelta = 5,
        UnitCost = 10,
        Reason = "  cycle count  ",
    };

    private static UpdateInventoryAdjustmentLineRequest ValidUpdate(Guid productId) => new()
    {
        ProductId = productId,
        QuantityDelta = -2,
        UnitCost = 9,
        Reason = "  correction  ",
    };

    [Fact]
    public async Task Create_AdjustmentNotFound_Returns404()
    {
        var (_, svc, _) = Build();
        var result = await svc.CreateAsync(Guid.NewGuid(), ValidCreate(Guid.NewGuid()));
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Create_NonDraftAdjustment_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Completed,
            Reason = "Completed",
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(adjustmentId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_ProductNotFound_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(adjustmentId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateProductLine_Returns409()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
            Lines =
            [
                new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = productId, QuantityDelta = 1, UnitCost = 1, IsActive = true }
            ]
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(adjustmentId, ValidCreate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_NormalizesReasonAndSavesLine()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(adjustmentId, ValidCreate(productId));

        Assert.True(result.Succeeded);
        var line = db.InventoryAdjustmentLines.Single();
        Assert.Equal("cycle count", line.Reason);
    }

    [Fact]
    public async Task Update_LineNotFound_Returns404()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(adjustmentId, Guid.NewGuid(), ValidUpdate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesAndNormalizesReason()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
            Lines = [new InventoryAdjustmentLine { Id = lineId, TenantId = tenantId, ProductId = productId, QuantityDelta = 1, UnitCost = 1, Reason = "old" }]
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(adjustmentId, lineId, ValidUpdate(productId));

        Assert.True(result.Succeeded);
        var line = db.InventoryAdjustmentLines.Single(x => x.Id == lineId);
        Assert.Equal(-2, line.QuantityDelta);
        Assert.Equal("correction", line.Reason);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesLine()
    {
        var (db, svc, tenantId) = Build();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-001",
            WarehouseId = Guid.NewGuid(),
            AdjustmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Reason = "Draft",
            Lines = [new InventoryAdjustmentLine { Id = lineId, TenantId = tenantId, ProductId = productId, QuantityDelta = 1, UnitCost = 1 }]
        });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(adjustmentId, lineId);

        Assert.True(result.Succeeded);
        Assert.Empty(db.InventoryAdjustmentLines);
    }
}
