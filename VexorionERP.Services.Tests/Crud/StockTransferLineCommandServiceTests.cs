using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class StockTransferLineCommandServiceTests
{
    private static (AppDbContext db, StockTransferLineCommandService svc, Guid tenantId) Build(string? dbName = null)
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, dbName ?? Guid.NewGuid().ToString());
        var svc = new StockTransferLineCommandService(db, new FixedTenantProvider(tenantId));
        return (db, svc, tenantId);
    }

    private static CreateStockTransferLineRequest ValidCreate(Guid productId) => new()
    {
        ProductId = productId,
        Quantity = 5,
        UnitCost = 10,
    };

    private static UpdateStockTransferLineRequest ValidUpdate(Guid productId) => new()
    {
        ProductId = productId,
        Quantity = 7,
        UnitCost = 11,
    };

    [Fact]
    public async Task Create_TransferNotFound_Returns404()
    {
        var (_, svc, _) = Build();
        var result = await svc.CreateAsync(Guid.NewGuid(), ValidCreate(Guid.NewGuid()));
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Create_NonDraftTransfer_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Completed,
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(transferId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_ProductNotFound_Returns400()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(transferId, ValidCreate(Guid.NewGuid()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateProductLine_Returns409()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines = [new StockTransferLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = productId, Quantity = 1, UnitCost = 1, IsActive = true }]
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(transferId, ValidCreate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_SavesLine()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
        });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(transferId, ValidCreate(productId));

        Assert.True(result.Succeeded);
        Assert.Single(db.StockTransferLines);
    }

    [Fact]
    public async Task Update_LineNotFound_Returns404()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(transferId, Guid.NewGuid(), ValidUpdate(productId));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesLine()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines = [new StockTransferLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 1, UnitCost = 1 }]
        });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(transferId, lineId, ValidUpdate(productId));

        Assert.True(result.Succeeded);
        var line = db.StockTransferLines.Single(x => x.Id == lineId);
        Assert.Equal(7, line.Quantity);
        Assert.Equal(11, line.UnitCost);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesLine()
    {
        var (db, svc, tenantId) = Build();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = DocumentStatus.Draft,
            Lines = [new StockTransferLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 1, UnitCost = 1 }]
        });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(transferId, lineId);

        Assert.True(result.Succeeded);
        Assert.Empty(db.StockTransferLines);
    }
}
