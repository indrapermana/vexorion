using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class StockTransferCommandServiceBranchTests
{
    private static IInventoryMovementPostingService GetMockService() => new TestMockService();

    private static (Guid tenantId, Guid srcWarehouseId, Guid dstWarehouseId, Guid productId, Guid transferId) SeedIds()
        => (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    private static StockTransferCommandService BuildService(AppDbContext db, Guid? tenantId)
        => new StockTransferCommandService(db, new FixedTenantProvider(tenantId), GetMockService());

    // ============= CreateAsync Branch Tests =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = BuildService(db, null);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingTransferNumber_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptySourceWarehouse_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = Guid.Empty,
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_SameSourceAndDestinationWarehouse_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = warehouseId,
            DestinationWarehouseId = warehouseId,
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_SourceWarehouseNotFound_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        // Only add destination warehouse, not source
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DestinationWarehouseNotFound_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        // Only add source warehouse, not destination
        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateTransferNumber_Returns409()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "st-001", // case-insensitive duplicate
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesDraftTransfer()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new CreateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30)
        };

        var result = await service.CreateAsync(request);

        Assert.True(result.Succeeded);
        Assert.Equal(DocumentStatus.Draft, result.Value!.Status);
    }

    // ============= UpdateAsync Branch Tests =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = BuildService(db, null);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(Guid.NewGuid(), request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingTransferNumber_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "",
            SourceWarehouseId = Guid.NewGuid(),
            DestinationWarehouseId = Guid.NewGuid(),
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(Guid.NewGuid(), request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Update_SameSourceAndDestinationWarehouse_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = warehouseId,
            DestinationWarehouseId = warehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(Guid.NewGuid(), request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Update_TransferNotFound_Returns404()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(Guid.NewGuid(), request);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_WarehouseNotFound_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = Guid.NewGuid(), // non-existent destination
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateTransferNumber_Returns409()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var otherId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = otherId,
            TenantId = tenantId,
            TransferNumber = "ST-002",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 21),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        // Try to rename ST-002 to st-001 (duplicate of ST-001)
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "st-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft
        };

        var result = await service.UpdateAsync(otherId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_ChangeWarehouseAfterPosted_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var newSrcId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.Warehouses.Add(new Warehouse { Id = newSrcId, TenantId = tenantId, Code = "WH-NEW", Name = "New WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Completed, // already completed/posted
            IsActive = true,
            Lines = new List<StockTransferLine> { new StockTransferLine { TenantId = tenantId, ProductId = productId, Quantity = 5, UnitCost = 10m, IsActive = true } }
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = newSrcId, // changing source warehouse after completion
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_CompleteWithoutActiveLines_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
            Lines = new List<StockTransferLine> { new StockTransferLine { TenantId = tenantId, ProductId = productId, Quantity = 5, UnitCost = 10m, IsActive = false } } // inactive line
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed // trying to complete with no active lines
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_InvalidStatusTransition_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Cancelled, // already cancelled
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft // invalid: Cancelled -> Draft not allowed
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesTransfer()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
            Lines = new List<StockTransferLine> { new StockTransferLine { TenantId = tenantId, ProductId = productId, Quantity = 5, UnitCost = 10m, IsActive = true } }
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001-UPDATED",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.True(result.Succeeded);
        Assert.Equal(DocumentStatus.Completed, result.Value!.Status);
    }

    [Fact]
    public async Task Update_SameStatus_Succeeds()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var request = new UpdateStockTransferRequest
        {
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft // same status, always allowed
        };

        var result = await service.UpdateAsync(transferId, request);

        Assert.True(result.Succeeded);
    }

    // ============= DeleteAsync Branch Tests =============

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = BuildService(db, null);

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_TransferNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = BuildService(db, tenantId);

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_NotDraft_Returns400()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Completed,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var result = await service.DeleteAsync(transferId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_Draft_Success()
    {
        var (tenantId, srcWarehouseId, dstWarehouseId, productId, transferId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = srcWarehouseId, TenantId = tenantId, Code = "WH-SRC", Name = "Source WH" });
        db.Warehouses.Add(new Warehouse { Id = dstWarehouseId, TenantId = tenantId, Code = "WH-DST", Name = "Destination WH" });
        db.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "ST-001",
            SourceWarehouseId = srcWarehouseId,
            DestinationWarehouseId = dstWarehouseId,
            TransferDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = BuildService(db, tenantId);
        var result = await service.DeleteAsync(transferId);

        Assert.True(result.Succeeded);

        var stillExists = await db.StockTransfers.AnyAsync(x => x.Id == transferId);
        Assert.False(stillExists);
    }

    // ============= Helper =============

    private class TestMockService : IInventoryMovementPostingService
    {
        public Task<ServiceResult<bool>> ApplyPurchaseOrderStatusChangeAsync(PurchaseOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplySalesOrderStatusChangeAsync(SalesOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyInventoryAdjustmentStatusChangeAsync(InventoryAdjustment adjustment, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyStockTransferStatusChangeAsync(StockTransfer transfer, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyStockCountStatusChangeAsync(StockCount stockCount, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyPurchaseReceiptAsync(PurchaseReceipt receipt, string purchaseOrderNumber, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplySalesShipmentAsync(SalesShipment shipment, string salesOrderNumber, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));
    }
}
