using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class InventoryMovementPostingServiceTests
{
    [Fact]
    public async Task ApplyPurchaseOrderStatusChange_NoApplicableTransition_DoesNothing()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new InventoryMovementPostingService(dbContext);

        var order = new PurchaseOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "PO-1",
            Lines =
            [
                new PurchaseOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 5m },
            ],
        };

        var result = await service.ApplyPurchaseOrderStatusChangeAsync(order, DocumentStatus.Completed, DocumentStatus.Cancelled);

        Assert.True(result.Succeeded);
        Assert.Empty(dbContext.InventoryMovements.Local);
        Assert.Empty(dbContext.InventoryBalances.Local);
    }

    [Fact]
    public async Task ApplyPurchaseOrderStatusChange_ReceiveTransition_CreatesMovementForActiveLinesOnly()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new InventoryMovementPostingService(dbContext);

        var order = new PurchaseOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "PO-2",
            Lines =
            [
                new PurchaseOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 5m, IsActive = true },
                new PurchaseOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 7m, IsActive = false },
            ],
        };

        var result = await service.ApplyPurchaseOrderStatusChangeAsync(order, DocumentStatus.Draft, DocumentStatus.Completed);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(5m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.PurchaseReceipt, movement.MovementType);
        Assert.Equal(5m, movement.Quantity);
        Assert.Equal("PO-2", movement.ReferenceNumber);
    }

    [Fact]
    public async Task ApplySalesOrderStatusChange_ReserveFails_WhenAvailableIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 10m, reserved: 9m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var order = new SalesOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-1",
            Lines =
            [
                new SalesOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 2m },
            ],
        };

        var result = await service.ApplySalesOrderStatusChangeAsync(order, DocumentStatus.Draft, DocumentStatus.Confirmed);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Insufficient available stock to reserve the sales order.", result.ErrorMessage);
    }

    [Fact]
    public async Task ApplySalesOrderStatusChange_ConfirmToComplete_ShipsAndReleasesReservation()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 10m, reserved: 6m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var order = new SalesOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-2",
            Lines =
            [
                new SalesOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 4m },
            ],
        };

        var result = await service.ApplySalesOrderStatusChangeAsync(order, DocumentStatus.Confirmed, DocumentStatus.Completed);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(6m, balance.QuantityOnHand);
        Assert.Equal(2m, balance.QuantityReserved);

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.SalesShipment, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
        Assert.Equal(-4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task ApplySalesOrderStatusChange_DraftToConfirmed_ReservesInventory()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 10m, reserved: 2m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var order = new SalesOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-2B",
            Lines =
            [
                new SalesOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 3m },
            ],
        };

        var result = await service.ApplySalesOrderStatusChangeAsync(order, DocumentStatus.Draft, DocumentStatus.Confirmed);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(10m, balance.QuantityOnHand);
        Assert.Equal(5m, balance.QuantityReserved);

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.SalesReservation, movement.MovementType);
        Assert.Equal(0m, movement.QuantityOnHandDelta);
        Assert.Equal(3m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task ApplySalesOrderStatusChange_ConfirmedToCancelled_ReleasesReservation()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 10m, reserved: 6m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var order = new SalesOrder
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-2C",
            Lines =
            [
                new SalesOrderLine { TenantId = tenantId, ProductId = productId, Quantity = 4m },
            ],
        };

        var result = await service.ApplySalesOrderStatusChangeAsync(order, DocumentStatus.Confirmed, DocumentStatus.Cancelled);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(10m, balance.QuantityOnHand);
        Assert.Equal(2m, balance.QuantityReserved);

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.SalesReservationRelease, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task ApplyStockTransferStatusChange_PostFails_WhenSourceOnHandInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, sourceWarehouseId, productId, onHand: 1m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var transfer = new StockTransfer
        {
            TenantId = tenantId,
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferNumber = "TR-1",
            Lines =
            [
                new StockTransferLine { TenantId = tenantId, ProductId = productId, Quantity = 3m },
            ],
        };

        var result = await service.ApplyStockTransferStatusChangeAsync(transfer, DocumentStatus.Confirmed, DocumentStatus.Completed);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Insufficient on-hand stock to complete the stock transfer.", result.ErrorMessage);
    }

    [Fact]
    public async Task ApplyStockTransferStatusChange_CompletedToCancelled_ReversesTransfer()
    {
        var tenantId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, sourceWarehouseId, productId, onHand: 1m, reserved: 0m);
        SeedBalance(dbContext, tenantId, destinationWarehouseId, productId, onHand: 5m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var transfer = new StockTransfer
        {
            TenantId = tenantId,
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferNumber = "TR-2",
            Lines =
            [
                new StockTransferLine { TenantId = tenantId, ProductId = productId, Quantity = 2m },
            ],
        };

        var result = await service.ApplyStockTransferStatusChangeAsync(transfer, DocumentStatus.Completed, DocumentStatus.Cancelled);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var source = await dbContext.InventoryBalances.SingleAsync(x => x.WarehouseId == sourceWarehouseId);
        var destination = await dbContext.InventoryBalances.SingleAsync(x => x.WarehouseId == destinationWarehouseId);

        Assert.Equal(3m, source.QuantityOnHand);
        Assert.Equal(3m, destination.QuantityOnHand);

        var movementTypes = await dbContext.InventoryMovements
            .Select(x => x.MovementType)
            .ToListAsync();

        Assert.Contains(InventoryMovementType.StockTransferOut, movementTypes);
        Assert.Contains(InventoryMovementType.StockTransferIn, movementTypes);
        Assert.Equal(2, movementTypes.Count);
    }

    [Fact]
    public async Task ApplyStockCountStatusChange_PostSkipsZeroVariance_AndAppliesNonZeroVariance()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productA = Guid.NewGuid();
        var productB = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productA, onHand: 3m, reserved: 0m);
        SeedBalance(dbContext, tenantId, warehouseId, productB, onHand: 2m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var stockCount = new StockCount
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            CountNumber = "SC-1",
            Lines =
            [
                new StockCountLine { TenantId = tenantId, ProductId = productA, SystemQuantity = 3m, CountedQuantity = 3m },
                new StockCountLine { TenantId = tenantId, ProductId = productB, SystemQuantity = 2m, CountedQuantity = 5m },
            ],
        };

        var result = await service.ApplyStockCountStatusChangeAsync(stockCount, DocumentStatus.Confirmed, DocumentStatus.Completed);

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var updatedB = await dbContext.InventoryBalances.SingleAsync(x => x.ProductId == productB);
        Assert.Equal(5m, updatedB.QuantityOnHand);

        var movements = await dbContext.InventoryMovements.ToListAsync();
        Assert.Single(movements);
        Assert.Equal(InventoryMovementType.StockCountVarianceIncrease, movements[0].MovementType);
        Assert.Equal(3m, movements[0].QuantityOnHandDelta);
    }

    [Fact]
    public async Task ApplyStockCountStatusChange_ReverseFails_WhenOnHandIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 1m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var stockCount = new StockCount
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            CountNumber = "SC-2",
            Lines =
            [
                new StockCountLine { TenantId = tenantId, ProductId = productId, SystemQuantity = 1m, CountedQuantity = 5m },
            ],
        };

        var result = await service.ApplyStockCountStatusChangeAsync(stockCount, DocumentStatus.Completed, DocumentStatus.Cancelled);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Insufficient on-hand stock to complete the stock transfer.", result.ErrorMessage);
    }

    [Fact]
    public async Task ApplyPurchaseReceipt_CreatesMovementAndBalance()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var purchaseOrderId = Guid.NewGuid();
        var purchaseOrderLineId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new InventoryMovementPostingService(dbContext);

        var receipt = new PurchaseReceipt
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            PurchaseOrderId = purchaseOrderId,
            ReceiptNumber = "PR-1",
            Lines =
            [
                new PurchaseReceiptLine
                {
                    TenantId = tenantId,
                    ProductId = productId,
                    PurchaseOrderLineId = purchaseOrderLineId,
                    ReceivedQuantity = 6m,
                },
            ],
        };

        var result = await service.ApplyPurchaseReceiptAsync(receipt, "PO-REF-1");

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(receipt.Id, movement.PurchaseReceiptId);
        Assert.Equal(purchaseOrderId, movement.PurchaseOrderId);
        Assert.Equal(purchaseOrderLineId, movement.PurchaseOrderLineId);
        Assert.Equal(InventoryMovementType.PurchaseReceipt, movement.MovementType);
        Assert.Equal(6m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task ApplyInventoryAdjustmentStatusChange_CompletedAndCancelled_ApplyAndReverseDelta()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 5m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var adjustment = new InventoryAdjustment
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            AdjustmentNumber = "ADJ-1",
            Lines =
            [
                new InventoryAdjustmentLine { TenantId = tenantId, ProductId = productId, QuantityDelta = 3m },
            ],
        };

        var postResult = await service.ApplyInventoryAdjustmentStatusChangeAsync(adjustment, DocumentStatus.Confirmed, DocumentStatus.Completed);
        Assert.True(postResult.Succeeded);

        var reverseResult = await service.ApplyInventoryAdjustmentStatusChangeAsync(adjustment, DocumentStatus.Completed, DocumentStatus.Cancelled);
        Assert.True(reverseResult.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(5m, balance.QuantityOnHand);

        var movementTypes = await dbContext.InventoryMovements.Select(x => x.MovementType).ToListAsync();
        Assert.Equal(2, movementTypes.Count);
        Assert.Contains(InventoryMovementType.InventoryAdjustmentIncrease, movementTypes);
        Assert.Contains(InventoryMovementType.InventoryAdjustmentDecrease, movementTypes);

        var deltas = await dbContext.InventoryMovements.Select(x => x.QuantityOnHandDelta).ToListAsync();
        Assert.Contains(3m, deltas);
        Assert.Contains(-3m, deltas);
    }

    [Fact]
    public async Task ApplySalesShipment_CreatesMovement_WhenSufficientOnHand()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var salesOrderId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 9m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var shipment = new SalesShipment
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            SalesOrderId = salesOrderId,
            ShipmentNumber = "SS-1-S",
            Lines =
            [
                new SalesShipmentLine
                {
                    TenantId = tenantId,
                    ProductId = productId,
                    SalesOrderLineId = Guid.NewGuid(),
                    ShippedQuantity = 3m,
                },
            ],
        };

        var result = await service.ApplySalesShipmentAsync(shipment, "SO-REF-1");

        Assert.True(result.Succeeded);

        await dbContext.SaveChangesAsync();

        var balance = await dbContext.InventoryBalances.SingleAsync();
        Assert.Equal(6m, balance.QuantityOnHand);

        var movement = await dbContext.InventoryMovements.SingleAsync();
        Assert.Equal(InventoryMovementType.SalesShipment, movement.MovementType);
        Assert.Equal(shipment.Id, movement.SalesShipmentId);
        Assert.Equal(salesOrderId, movement.SalesOrderId);
    }

    [Fact]
    public async Task ApplySalesShipment_Fails_WhenWarehouseOnHandIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        SeedBalance(dbContext, tenantId, warehouseId, productId, onHand: 2m, reserved: 0m);
        await dbContext.SaveChangesAsync();

        var service = new InventoryMovementPostingService(dbContext);
        var shipment = new SalesShipment
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            ShipmentNumber = "SS-1",
            Lines =
            [
                new SalesShipmentLine
                {
                    TenantId = tenantId,
                    ProductId = productId,
                    SalesOrderLineId = Guid.NewGuid(),
                    ShippedQuantity = 3m,
                },
            ],
        };

        var result = await service.ApplySalesShipmentAsync(shipment, "SO-REF-1");

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Insufficient on-hand stock to complete the stock transfer.", result.ErrorMessage);
    }

    private static void SeedBalance(AppDbContext dbContext, Guid tenantId, Guid warehouseId, Guid productId, decimal onHand, decimal reserved)
    {
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            WarehouseId = warehouseId,
            ProductId = productId,
            QuantityOnHand = onHand,
            QuantityReserved = reserved,
        });
    }
}
