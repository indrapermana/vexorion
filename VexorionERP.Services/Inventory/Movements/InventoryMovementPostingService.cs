using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InventoryMovementPostingService(AppDbContext dbContext) : IInventoryMovementPostingService
{
    public async Task<ServiceResult<bool>> ApplyPurchaseOrderStatusChangeAsync(PurchaseOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
    {
        if (!ShouldReceivePurchaseOrder(previousStatus, newStatus))
        {
            return ServiceResult<bool>.Success(true);
        }

        foreach (var line in order.Lines.Where(x => x.IsActive))
        {
            var applyResult = await ApplyMovementAsync(
                tenantId: order.TenantId,
                productId: line.ProductId,
                warehouseId: order.WarehouseId,
                movementType: InventoryMovementType.PurchaseReceipt,
                quantity: line.Quantity,
                quantityOnHandDelta: line.Quantity,
                quantityReservedDelta: 0m,
                referenceNumber: order.OrderNumber,
                purchaseOrderId: order.Id,
                purchaseOrderLineId: line.Id,
                salesOrderId: null,
                salesOrderLineId: null,
                inventoryAdjustmentId: null,
                inventoryAdjustmentLineId: null,
                stockTransferId: null,
                stockTransferLineId: null,
                cancellationToken: cancellationToken);

            if (!applyResult.Succeeded)
            {
                return applyResult;
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ApplySalesOrderStatusChangeAsync(SalesOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
    {
        if (ShouldReserveSalesOrder(previousStatus, newStatus))
        {
            var reservationValidation = await ValidateAvailableStockAsync(order, cancellationToken);
            if (!reservationValidation.Succeeded)
            {
                return reservationValidation;
            }

            foreach (var line in order.Lines.Where(x => x.IsActive))
            {
                var reserveResult = await ApplyMovementAsync(
                    tenantId: order.TenantId,
                    productId: line.ProductId,
                    warehouseId: order.WarehouseId,
                    movementType: InventoryMovementType.SalesReservation,
                    quantity: line.Quantity,
                    quantityOnHandDelta: 0m,
                    quantityReservedDelta: line.Quantity,
                    referenceNumber: order.OrderNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: order.Id,
                    salesOrderLineId: line.Id,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!reserveResult.Succeeded)
                {
                    return reserveResult;
                }
            }
        }

        if (ShouldReleaseSalesReservation(previousStatus, newStatus))
        {
            foreach (var line in order.Lines.Where(x => x.IsActive))
            {
                var releaseResult = await ApplyMovementAsync(
                    tenantId: order.TenantId,
                    productId: line.ProductId,
                    warehouseId: order.WarehouseId,
                    movementType: InventoryMovementType.SalesReservationRelease,
                    quantity: line.Quantity,
                    quantityOnHandDelta: 0m,
                    quantityReservedDelta: -line.Quantity,
                    referenceNumber: order.OrderNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: order.Id,
                    salesOrderLineId: line.Id,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!releaseResult.Succeeded)
                {
                    return releaseResult;
                }
            }
        }

        if (ShouldShipSalesOrder(previousStatus, newStatus))
        {
            var shippingValidation = await ValidateOnHandStockAsync(order, cancellationToken);
            if (!shippingValidation.Succeeded)
            {
                return shippingValidation;
            }

            foreach (var line in order.Lines.Where(x => x.IsActive))
            {
                var shipResult = await ApplyMovementAsync(
                    tenantId: order.TenantId,
                    productId: line.ProductId,
                    warehouseId: order.WarehouseId,
                    movementType: InventoryMovementType.SalesShipment,
                    quantity: line.Quantity,
                    quantityOnHandDelta: -line.Quantity,
                    quantityReservedDelta: previousStatus == DocumentStatus.Confirmed ? -line.Quantity : 0m,
                    referenceNumber: order.OrderNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: order.Id,
                    salesOrderLineId: line.Id,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!shipResult.Succeeded)
                {
                    return shipResult;
                }
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ApplyInventoryAdjustmentStatusChangeAsync(InventoryAdjustment adjustment, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
    {
        if (ShouldPostInventoryAdjustment(previousStatus, newStatus))
        {
            foreach (var line in adjustment.Lines.Where(x => x.IsActive))
            {
                var result = await ApplyMovementAsync(
                    tenantId: adjustment.TenantId,
                    productId: line.ProductId,
                    warehouseId: adjustment.WarehouseId,
                    movementType: line.QuantityDelta >= 0 ? InventoryMovementType.InventoryAdjustmentIncrease : InventoryMovementType.InventoryAdjustmentDecrease,
                    quantity: Math.Abs(line.QuantityDelta),
                    quantityOnHandDelta: line.QuantityDelta,
                    quantityReservedDelta: 0m,
                    referenceNumber: adjustment.AdjustmentNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: adjustment.Id,
                    inventoryAdjustmentLineId: line.Id,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!result.Succeeded)
                {
                    return result;
                }
            }
        }

        if (ShouldReverseInventoryAdjustment(previousStatus, newStatus))
        {
            foreach (var line in adjustment.Lines.Where(x => x.IsActive))
            {
                var reversedDelta = -line.QuantityDelta;
                var result = await ApplyMovementAsync(
                    tenantId: adjustment.TenantId,
                    productId: line.ProductId,
                    warehouseId: adjustment.WarehouseId,
                    movementType: reversedDelta >= 0 ? InventoryMovementType.InventoryAdjustmentIncrease : InventoryMovementType.InventoryAdjustmentDecrease,
                    quantity: Math.Abs(reversedDelta),
                    quantityOnHandDelta: reversedDelta,
                    quantityReservedDelta: 0m,
                    referenceNumber: adjustment.AdjustmentNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: adjustment.Id,
                    inventoryAdjustmentLineId: line.Id,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!result.Succeeded)
                {
                    return result;
                }
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ApplyStockTransferStatusChangeAsync(StockTransfer transfer, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
    {
        if (ShouldPostStockTransfer(previousStatus, newStatus))
        {
            foreach (var line in transfer.Lines.Where(x => x.IsActive))
            {
                var validation = await ValidateWarehouseOnHandStockAsync(transfer.TenantId, transfer.SourceWarehouseId, line.ProductId, line.Quantity, cancellationToken);
                if (!validation.Succeeded)
                {
                    return validation;
                }

                var sourceResult = await ApplyMovementAsync(
                    tenantId: transfer.TenantId,
                    productId: line.ProductId,
                    warehouseId: transfer.SourceWarehouseId,
                    movementType: InventoryMovementType.StockTransferOut,
                    quantity: line.Quantity,
                    quantityOnHandDelta: -line.Quantity,
                    quantityReservedDelta: 0m,
                    referenceNumber: transfer.TransferNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: transfer.Id,
                    stockTransferLineId: line.Id,
                    cancellationToken: cancellationToken);

                if (!sourceResult.Succeeded)
                {
                    return sourceResult;
                }

                var destinationResult = await ApplyMovementAsync(
                    tenantId: transfer.TenantId,
                    productId: line.ProductId,
                    warehouseId: transfer.DestinationWarehouseId,
                    movementType: InventoryMovementType.StockTransferIn,
                    quantity: line.Quantity,
                    quantityOnHandDelta: line.Quantity,
                    quantityReservedDelta: 0m,
                    referenceNumber: transfer.TransferNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: transfer.Id,
                    stockTransferLineId: line.Id,
                    cancellationToken: cancellationToken);

                if (!destinationResult.Succeeded)
                {
                    return destinationResult;
                }
            }
        }

        if (ShouldReverseStockTransfer(previousStatus, newStatus))
        {
            foreach (var line in transfer.Lines.Where(x => x.IsActive))
            {
                var validation = await ValidateWarehouseOnHandStockAsync(transfer.TenantId, transfer.DestinationWarehouseId, line.ProductId, line.Quantity, cancellationToken);
                if (!validation.Succeeded)
                {
                    return validation;
                }

                var destinationResult = await ApplyMovementAsync(
                    tenantId: transfer.TenantId,
                    productId: line.ProductId,
                    warehouseId: transfer.DestinationWarehouseId,
                    movementType: InventoryMovementType.StockTransferOut,
                    quantity: line.Quantity,
                    quantityOnHandDelta: -line.Quantity,
                    quantityReservedDelta: 0m,
                    referenceNumber: transfer.TransferNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: transfer.Id,
                    stockTransferLineId: line.Id,
                    cancellationToken: cancellationToken);

                if (!destinationResult.Succeeded)
                {
                    return destinationResult;
                }

                var sourceResult = await ApplyMovementAsync(
                    tenantId: transfer.TenantId,
                    productId: line.ProductId,
                    warehouseId: transfer.SourceWarehouseId,
                    movementType: InventoryMovementType.StockTransferIn,
                    quantity: line.Quantity,
                    quantityOnHandDelta: line.Quantity,
                    quantityReservedDelta: 0m,
                    referenceNumber: transfer.TransferNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: transfer.Id,
                    stockTransferLineId: line.Id,
                    cancellationToken: cancellationToken);

                if (!sourceResult.Succeeded)
                {
                    return sourceResult;
                }
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ApplyStockCountStatusChangeAsync(StockCount stockCount, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
    {
        if (ShouldPostStockCount(previousStatus, newStatus))
        {
            foreach (var line in stockCount.Lines.Where(x => x.IsActive))
            {
                var varianceQuantity = line.CountedQuantity - line.SystemQuantity;
                if (varianceQuantity == 0)
                {
                    continue;
                }

                if (varianceQuantity < 0)
                {
                    var validation = await ValidateWarehouseOnHandStockAsync(stockCount.TenantId, stockCount.WarehouseId, line.ProductId, Math.Abs(varianceQuantity), cancellationToken);
                    if (!validation.Succeeded)
                    {
                        return validation;
                    }
                }

                var result = await ApplyMovementAsync(
                    tenantId: stockCount.TenantId,
                    productId: line.ProductId,
                    warehouseId: stockCount.WarehouseId,
                    movementType: varianceQuantity >= 0 ? InventoryMovementType.StockCountVarianceIncrease : InventoryMovementType.StockCountVarianceDecrease,
                    quantity: Math.Abs(varianceQuantity),
                    quantityOnHandDelta: varianceQuantity,
                    quantityReservedDelta: 0m,
                    referenceNumber: stockCount.CountNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!result.Succeeded)
                {
                    return result;
                }
            }
        }

        if (ShouldReverseStockCount(previousStatus, newStatus))
        {
            foreach (var line in stockCount.Lines.Where(x => x.IsActive))
            {
                var reversedVariance = line.SystemQuantity - line.CountedQuantity;
                if (reversedVariance == 0)
                {
                    continue;
                }

                if (reversedVariance < 0)
                {
                    var validation = await ValidateWarehouseOnHandStockAsync(stockCount.TenantId, stockCount.WarehouseId, line.ProductId, Math.Abs(reversedVariance), cancellationToken);
                    if (!validation.Succeeded)
                    {
                        return validation;
                    }
                }

                var result = await ApplyMovementAsync(
                    tenantId: stockCount.TenantId,
                    productId: line.ProductId,
                    warehouseId: stockCount.WarehouseId,
                    movementType: reversedVariance >= 0 ? InventoryMovementType.StockCountVarianceIncrease : InventoryMovementType.StockCountVarianceDecrease,
                    quantity: Math.Abs(reversedVariance),
                    quantityOnHandDelta: reversedVariance,
                    quantityReservedDelta: 0m,
                    referenceNumber: stockCount.CountNumber,
                    purchaseOrderId: null,
                    purchaseOrderLineId: null,
                    salesOrderId: null,
                    salesOrderLineId: null,
                    inventoryAdjustmentId: null,
                    inventoryAdjustmentLineId: null,
                    stockTransferId: null,
                    stockTransferLineId: null,
                    cancellationToken: cancellationToken);

                if (!result.Succeeded)
                {
                    return result;
                }
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<ServiceResult<bool>> ValidateAvailableStockAsync(SalesOrder order, CancellationToken cancellationToken)
    {
        var requiredByProduct = order.Lines
            .Where(x => x.IsActive)
            .GroupBy(x => x.ProductId)
            .ToDictionary(group => group.Key, group => group.Sum(line => line.Quantity));

        foreach (var (productId, requiredQuantity) in requiredByProduct)
        {
            var balance = await dbContext.InventoryBalances
                .FirstOrDefaultAsync(x => x.TenantId == order.TenantId && x.ProductId == productId && x.WarehouseId == order.WarehouseId, cancellationToken);

            var availableQuantity = balance?.QuantityAvailable ?? 0m;
            if (availableQuantity < requiredQuantity)
            {
                return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Insufficient available stock to reserve the sales order.");
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<ServiceResult<bool>> ValidateOnHandStockAsync(SalesOrder order, CancellationToken cancellationToken)
    {
        var requiredByProduct = order.Lines
            .Where(x => x.IsActive)
            .GroupBy(x => x.ProductId)
            .ToDictionary(group => group.Key, group => group.Sum(line => line.Quantity));

        foreach (var (productId, requiredQuantity) in requiredByProduct)
        {
            var balance = await dbContext.InventoryBalances
                .FirstOrDefaultAsync(x => x.TenantId == order.TenantId && x.ProductId == productId && x.WarehouseId == order.WarehouseId, cancellationToken);

            var onHandQuantity = balance?.QuantityOnHand ?? 0m;
            if (onHandQuantity < requiredQuantity)
            {
                return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Insufficient on-hand stock to complete the sales order.");
            }
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<ServiceResult<bool>> ValidateWarehouseOnHandStockAsync(Guid tenantId, Guid warehouseId, Guid productId, decimal requiredQuantity, CancellationToken cancellationToken)
    {
        var balance = await dbContext.InventoryBalances
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.ProductId == productId && x.WarehouseId == warehouseId, cancellationToken);

        var onHandQuantity = balance?.QuantityOnHand ?? 0m;
        if (onHandQuantity < requiredQuantity)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Insufficient on-hand stock to complete the stock transfer.");
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<ServiceResult<bool>> ApplyMovementAsync(
        Guid tenantId,
        Guid productId,
        Guid warehouseId,
        InventoryMovementType movementType,
        decimal quantity,
        decimal quantityOnHandDelta,
        decimal quantityReservedDelta,
        string referenceNumber,
        Guid? purchaseOrderId,
        Guid? purchaseOrderLineId,
        Guid? salesOrderId,
        Guid? salesOrderLineId,
        Guid? inventoryAdjustmentId,
        Guid? inventoryAdjustmentLineId,
        Guid? stockTransferId,
        Guid? stockTransferLineId,
        CancellationToken cancellationToken)
    {
        var balance = await dbContext.InventoryBalances
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.ProductId == productId && x.WarehouseId == warehouseId, cancellationToken);

        if (balance is null)
        {
            balance = new InventoryBalance
            {
                TenantId = tenantId,
                ProductId = productId,
                WarehouseId = warehouseId,
                QuantityOnHand = 0m,
                QuantityReserved = 0m,
            };

            dbContext.InventoryBalances.Add(balance);
        }

        var nextOnHand = balance.QuantityOnHand + quantityOnHandDelta;
        var nextReserved = balance.QuantityReserved + quantityReservedDelta;

        if (nextOnHand < 0)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Inventory on hand cannot become negative.");
        }

        if (nextReserved < 0)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Inventory reserved quantity cannot become negative.");
        }

        if (nextReserved > nextOnHand)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Reserved quantity cannot exceed quantity on hand.");
        }

        balance.QuantityOnHand = nextOnHand;
        balance.QuantityReserved = nextReserved;

        dbContext.InventoryMovements.Add(new InventoryMovement
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            MovementType = movementType,
            Quantity = quantity,
            QuantityOnHandDelta = quantityOnHandDelta,
            QuantityReservedDelta = quantityReservedDelta,
            ReferenceNumber = referenceNumber,
            PurchaseOrderId = purchaseOrderId,
            PurchaseOrderLineId = purchaseOrderLineId,
            SalesOrderId = salesOrderId,
            SalesOrderLineId = salesOrderLineId,
            InventoryAdjustmentId = inventoryAdjustmentId,
            InventoryAdjustmentLineId = inventoryAdjustmentLineId,
            StockTransferId = stockTransferId,
            StockTransferLineId = stockTransferLineId,
        });

        return ServiceResult<bool>.Success(true);
    }

    private static bool ShouldReceivePurchaseOrder(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus is not (DocumentStatus.PartiallyProcessed or DocumentStatus.Completed)
            && newStatus is DocumentStatus.PartiallyProcessed or DocumentStatus.Completed;

    private static bool ShouldReserveSalesOrder(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Draft && newStatus == DocumentStatus.Confirmed;

    private static bool ShouldReleaseSalesReservation(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Confirmed && newStatus == DocumentStatus.Cancelled;

    private static bool ShouldShipSalesOrder(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus is DocumentStatus.Draft or DocumentStatus.Confirmed
            && newStatus is DocumentStatus.PartiallyProcessed or DocumentStatus.Completed;

    private static bool ShouldPostInventoryAdjustment(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus != DocumentStatus.Completed && newStatus == DocumentStatus.Completed;

    private static bool ShouldReverseInventoryAdjustment(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Completed && newStatus == DocumentStatus.Cancelled;

    private static bool ShouldPostStockTransfer(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus != DocumentStatus.Completed && newStatus == DocumentStatus.Completed;

    private static bool ShouldReverseStockTransfer(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Completed && newStatus == DocumentStatus.Cancelled;

    private static bool ShouldPostStockCount(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus != DocumentStatus.Completed && newStatus == DocumentStatus.Completed;

    private static bool ShouldReverseStockCount(DocumentStatus previousStatus, DocumentStatus newStatus)
        => previousStatus == DocumentStatus.Completed && newStatus == DocumentStatus.Cancelled;
}