using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class InventoryAdjustmentCommandServiceTests
{
    [Fact]
    public async Task CompletingAdjustment_WithPositiveQuantity_PostsIncreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-1",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Opening correction",
            Lines =
            [
                new InventoryAdjustmentLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    InventoryAdjustmentId = adjustmentId,
                    ProductId = productId,
                    QuantityDelta = 8m,
                    UnitCost = 3m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-1",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Opening correction",
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(8m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.InventoryAdjustmentIncrease, movement.MovementType);
        Assert.Equal(8m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task CompletingAdjustment_WithNegativeQuantity_PostsDecreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 10m,
            QuantityReserved = 0m,
        });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-2",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Damage write-off",
            Lines =
            [
                new InventoryAdjustmentLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    InventoryAdjustmentId = adjustmentId,
                    ProductId = productId,
                    QuantityDelta = -4m,
                    UnitCost = 3m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-2",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Damage write-off",
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.InventoryAdjustmentDecrease, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task CompletingAdjustment_WithoutActiveLines_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-NO-LINES",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Cycle count",
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-NO-LINES",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Cycle count",
        });

        Assert.False(result.Succeeded);
        Assert.Empty(dbContext.InventoryMovements);
    }

    [Fact]
    public async Task CancellingPostedAdjustment_WithChangedWarehouse_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var originalWarehouseId = Guid.NewGuid();
        var alternateWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-LOCK", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = originalWarehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" },
            new Warehouse { Id = alternateWarehouseId, TenantId = tenantId, Code = "ALT", Name = "Alternate Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = originalWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Lock warehouse",
            Lines =
            [
                new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, InventoryAdjustmentId = adjustmentId, ProductId = productId, QuantityDelta = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var completeResult = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = originalWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Lock warehouse",
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = alternateWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Reason = "Lock warehouse",
        });

        Assert.False(cancelResult.Succeeded);
    }

    [Fact]
    public async Task CreatingAdjustmentLine_WithDuplicateActiveProduct_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-DUP", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-DUP-LINE",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, InventoryAdjustmentId = adjustmentId, ProductId = productId, QuantityDelta = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(adjustmentId, new CreateInventoryAdjustmentLineRequest
        {
            ProductId = productId,
            QuantityDelta = 3m,
            UnitCost = 1m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(1, dbContext.InventoryAdjustmentLines.Count());
    }

    [Fact]
    public async Task Update_WithInvalidStatusTransition_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-INVALID-STATE",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Reason = "Cancelled",
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-INVALID-STATE",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Cancelled",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_WhenNonDraft_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-NON-DRAFT",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Completed",
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.DeleteAsync(adjustmentId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_WhenMovementPostingFails_ReturnsFailure()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-FAIL", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-FAIL",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Should fail posting",
            Lines = [new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = productId, QuantityDelta = 2m, UnitCost = 1m, IsActive = true }],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new FailingInventoryMovementPostingService());
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-FAIL",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Should fail posting",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("posting-failed", result.ErrorMessage);
    }

    private sealed class FailingInventoryMovementPostingService : IInventoryMovementPostingService
    {
        public Task<ServiceResult<bool>> ApplyPurchaseOrderStatusChangeAsync(PurchaseOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
        public Task<ServiceResult<bool>> ApplySalesOrderStatusChangeAsync(SalesOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
        public Task<ServiceResult<bool>> ApplyInventoryAdjustmentStatusChangeAsync(InventoryAdjustment adjustment, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Failure(409, "posting-failed"));
        public Task<ServiceResult<bool>> ApplyStockTransferStatusChangeAsync(StockTransfer transfer, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
        public Task<ServiceResult<bool>> ApplyStockCountStatusChangeAsync(StockCount stockCount, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
        public Task<ServiceResult<bool>> ApplyPurchaseReceiptAsync(PurchaseReceipt receipt, string purchaseOrderNumber, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
        public Task<ServiceResult<bool>> ApplySalesShipmentAsync(SalesShipment shipment, string salesOrderNumber, CancellationToken cancellationToken = default) => Task.FromResult(ServiceResult<bool>.Success(true));
    }
}
