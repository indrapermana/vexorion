using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Services;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class StockTransferCommandServiceTests
{
    [Fact]
    public async Task CompletingTransfer_MovesInventoryBetweenWarehouses()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            QuantityOnHand = 12m,
            QuantityReserved = 0m,
        });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-1",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 5m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-1",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balances = dbContext.InventoryBalances.OrderBy(x => x.WarehouseId).ToList();
        Assert.Equal(2, balances.Count);
        Assert.Equal(7m, balances.Single(x => x.WarehouseId == sourceWarehouseId).QuantityOnHand);
        Assert.Equal(5m, balances.Single(x => x.WarehouseId == destinationWarehouseId).QuantityOnHand);
        var movements = dbContext.InventoryMovements.OrderBy(x => x.MovementType).ToList();
        Assert.Equal(2, movements.Count);
        Assert.Contains(movements, x => x.MovementType == InventoryMovementType.StockTransferOut && x.QuantityOnHandDelta == -5m);
        Assert.Contains(movements, x => x.MovementType == InventoryMovementType.StockTransferIn && x.QuantityOnHandDelta == 5m);
    }

    [Fact]
    public async Task CompletingTransfer_WithInsufficientSourceStock_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            QuantityOnHand = 2m,
            QuantityReserved = 0m,
        });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-2",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 5m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-2",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(0, dbContext.InventoryMovements.Count());
        Assert.Equal(2m, dbContext.InventoryBalances.Single().QuantityOnHand);
    }

    [Fact]
    public async Task CancellingPostedTransfer_ReversesInventoryMovements()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-3", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.AddRange(
            new InventoryBalance
            {
                TenantId = tenantId,
                ProductId = productId,
                WarehouseId = sourceWarehouseId,
                QuantityOnHand = 12m,
                QuantityReserved = 0m,
            },
            new InventoryBalance
            {
                TenantId = tenantId,
                ProductId = productId,
                WarehouseId = destinationWarehouseId,
                QuantityOnHand = 0m,
                QuantityReserved = 0m,
            });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 4m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var completeResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Notes = null,
        });

        Assert.True(cancelResult.Succeeded);
        var sourceBalance = dbContext.InventoryBalances.Single(x => x.WarehouseId == sourceWarehouseId);
        var destinationBalance = dbContext.InventoryBalances.Single(x => x.WarehouseId == destinationWarehouseId);
        Assert.Equal(12m, sourceBalance.QuantityOnHand);
        Assert.Equal(0m, destinationBalance.QuantityOnHand);
        Assert.Equal(4, dbContext.InventoryMovements.Count());
    }

    [Fact]
    public async Task CompletingTransfer_WithoutActiveLines_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-NO-LINES",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-NO-LINES",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
        });

        Assert.False(result.Succeeded);
        Assert.Empty(dbContext.InventoryMovements);
    }

    [Fact]
    public async Task CancellingPostedTransfer_WithChangedWarehouses_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var alternateWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-LOCK", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" },
            new Warehouse { Id = alternateWarehouseId, TenantId = tenantId, Code = "ALT", Name = "Alternate" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = sourceWarehouseId, QuantityOnHand = 10m, QuantityReserved = 0m });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine { Id = Guid.NewGuid(), TenantId = tenantId, StockTransferId = transferId, ProductId = productId, Quantity = 3m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var completeResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = alternateWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
        });

        Assert.False(cancelResult.Succeeded);
    }

    [Fact]
    public async Task CreatingTransferLine_WithDuplicateActiveProduct_FailsValidation()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-DUP", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-DUP-LINE",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine { Id = Guid.NewGuid(), TenantId = tenantId, StockTransferId = transferId, ProductId = productId, Quantity = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(transferId, new CreateStockTransferLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitCost = 1m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(1, dbContext.StockTransferLines.Count());
    }
}