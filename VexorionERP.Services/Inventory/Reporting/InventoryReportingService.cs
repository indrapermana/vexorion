using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public sealed class InventoryReportingService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInventoryReportingService
{
    private const int MaximumMovementPageSize = 500;

    public async Task<ServiceResult<InventoryValuationReportResponse>> GetValuationAsync(Guid? warehouseId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<InventoryValuationReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var balances = await (
            from balance in dbContext.InventoryBalances.AsNoTracking()
            join product in dbContext.Products.AsNoTracking() on new { balance.TenantId, Id = balance.ProductId } equals new { product.TenantId, product.Id }
            join warehouse in dbContext.Warehouses.AsNoTracking() on new { balance.TenantId, Id = balance.WarehouseId } equals new { warehouse.TenantId, warehouse.Id }
            where balance.TenantId == tenantId && (!warehouseId.HasValue || balance.WarehouseId == warehouseId.Value)
            select new ValuationBalanceRow(
                balance.ProductId,
                product.Sku,
                product.Name,
                product.UnitOfMeasure,
                product.StandardCost,
                balance.WarehouseId,
                warehouse.Code,
                warehouse.Name,
                balance.QuantityOnHand))
            .ToListAsync(cancellationToken);

        var movements = await (
            from movement in dbContext.InventoryMovements.AsNoTracking()
            join product in dbContext.Products.AsNoTracking() on new { movement.TenantId, Id = movement.ProductId } equals new { product.TenantId, product.Id }
            join warehouse in dbContext.Warehouses.AsNoTracking() on new { movement.TenantId, Id = movement.WarehouseId } equals new { warehouse.TenantId, warehouse.Id }
            where movement.TenantId == tenantId && (!warehouseId.HasValue || movement.WarehouseId == warehouseId.Value)
            group movement by new
            {
                movement.ProductId,
                movement.WarehouseId,
                product.Sku,
                ProductName = product.Name,
                product.UnitOfMeasure,
                product.StandardCost,
                WarehouseCode = warehouse.Code,
                WarehouseName = warehouse.Name,
            }
            into movementGroup
            select new ValuationMovementRow(
                movementGroup.Key.ProductId,
                movementGroup.Key.Sku,
                movementGroup.Key.ProductName,
                movementGroup.Key.UnitOfMeasure,
                movementGroup.Key.StandardCost,
                movementGroup.Key.WarehouseId,
                movementGroup.Key.WarehouseCode,
                movementGroup.Key.WarehouseName,
                movementGroup.Sum(x => x.QuantityOnHandDelta)))
            .ToListAsync(cancellationToken);

        var balanceByKey = balances.ToDictionary(x => (x.ProductId, x.WarehouseId));
        var movementByKey = movements.ToDictionary(x => (x.ProductId, x.WarehouseId));
        var keys = balanceByKey.Keys.Concat(movementByKey.Keys).Distinct();
        var items = keys.Select(key =>
        {
            balanceByKey.TryGetValue(key, out var balance);
            movementByKey.TryGetValue(key, out var movement);
            var standardCost = balance?.CurrentStandardCost ?? movement!.CurrentStandardCost;
            var quantityOnHand = balance?.QuantityOnHand ?? 0m;
            var ledgerQuantity = movement?.LedgerNetQuantity ?? 0m;

            return new InventoryValuationItemResponse(
                key.ProductId,
                balance?.Sku ?? movement!.Sku,
                balance?.ProductName ?? movement!.ProductName,
                balance?.UnitOfMeasure ?? movement!.UnitOfMeasure,
                key.WarehouseId,
                balance?.WarehouseCode ?? movement!.WarehouseCode,
                balance?.WarehouseName ?? movement!.WarehouseName,
                quantityOnHand,
                standardCost,
                quantityOnHand * standardCost,
                ledgerQuantity,
                quantityOnHand - ledgerQuantity);
        }).OrderBy(x => x.Sku).ThenBy(x => x.WarehouseCode).ToList();

        return ServiceResult<InventoryValuationReportResponse>.Success(new InventoryValuationReportResponse(
            DateTimeOffset.UtcNow,
            items.Sum(x => x.EstimatedValue),
            items.Count(x => x.BalanceToLedgerVariance == 0m),
            items.Count(x => x.BalanceToLedgerVariance != 0m),
            items));
    }

    public async Task<ServiceResult<InventoryMovementAuditResponse>> GetMovementAuditAsync(
        DateOnly? startDate,
        DateOnly? endDate,
        Guid? warehouseId,
        Guid? productId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<InventoryMovementAuditResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            return ServiceResult<InventoryMovementAuditResponse>.Failure(StatusCodes.Status400BadRequest, "Start date must be on or before end date.");
        if (skip < 0 || take is < 1 or > MaximumMovementPageSize)
            return ServiceResult<InventoryMovementAuditResponse>.Failure(StatusCodes.Status400BadRequest, $"Skip must be non-negative and take must be between 1 and {MaximumMovementPageSize}.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var query = BuildMovementAuditQuery(tenantId, startDate, endDate, warehouseId, productId);
        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
        var items = rows.Select(row =>
        {
            var (sourceType, sourceId) = GetSourceDocument(row);
            var createdAt = DateTime.SpecifyKind(row.CreatedAtUtc, DateTimeKind.Utc);
            return new InventoryMovementAuditItemResponse(
                row.Id,
                new DateTimeOffset(createdAt),
                row.MovementType,
                row.ProductId,
                row.Sku,
                row.ProductName,
                row.WarehouseId,
                row.WarehouseCode,
                row.WarehouseName,
                row.Quantity,
                row.QuantityOnHandDelta,
                row.QuantityReservedDelta,
                row.ReferenceNumber,
                sourceType,
                sourceId);
        }).ToList();

        return ServiceResult<InventoryMovementAuditResponse>.Success(new InventoryMovementAuditResponse(skip, take, totalCount, items));
    }

    internal IQueryable<MovementAuditRow> BuildMovementAuditQuery(Guid tenantId, DateOnly? startDate, DateOnly? endDate, Guid? warehouseId, Guid? productId)
    {
        var movementQuery = dbContext.InventoryMovements.AsNoTracking()
            .Where(movement => movement.TenantId == tenantId
                && (!warehouseId.HasValue || movement.WarehouseId == warehouseId.Value)
                && (!productId.HasValue || movement.ProductId == productId.Value));

        if (startDate.HasValue)
        {
            var startUtc = startDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            movementQuery = movementQuery.Where(movement => movement.CreatedAtUtc >= startUtc);
        }
        if (endDate.HasValue)
        {
            var endExclusiveUtc = endDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddDays(1);
            movementQuery = movementQuery.Where(movement => movement.CreatedAtUtc < endExclusiveUtc);
        }

        var query =
            from movement in movementQuery
            join product in dbContext.Products.AsNoTracking() on new { movement.TenantId, Id = movement.ProductId } equals new { product.TenantId, product.Id }
            join warehouse in dbContext.Warehouses.AsNoTracking() on new { movement.TenantId, Id = movement.WarehouseId } equals new { warehouse.TenantId, warehouse.Id }
            orderby movement.CreatedAtUtc descending, movement.Id descending
            select new MovementAuditRow(
                movement.Id,
                movement.CreatedAtUtc,
                movement.MovementType.ToString(),
                movement.ProductId,
                product.Sku,
                product.Name,
                movement.WarehouseId,
                warehouse.Code,
                warehouse.Name,
                movement.Quantity,
                movement.QuantityOnHandDelta,
                movement.QuantityReservedDelta,
                movement.ReferenceNumber,
                movement.PurchaseOrderId,
                movement.SalesOrderId,
                movement.InventoryAdjustmentId,
                movement.StockTransferId,
                movement.PurchaseReceiptId,
                movement.SalesShipmentId,
                movement.PosRefundRecordId);
            return query;
    }

    public async Task<ServiceResult<InventoryReorderReportResponse>> GetReorderRecommendationsAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<InventoryReorderReportResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var availableByProduct = await (
            from balance in dbContext.InventoryBalances.AsNoTracking()
            join warehouse in dbContext.Warehouses.AsNoTracking() on new { balance.TenantId, Id = balance.WarehouseId } equals new { warehouse.TenantId, warehouse.Id }
            where balance.TenantId == tenantId && balance.IsActive && warehouse.IsActive
            group balance by balance.ProductId
            into productBalances
            select new
            {
                ProductId = productBalances.Key,
                Available = productBalances.Sum(x => x.QuantityOnHand - x.QuantityReserved),
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.Available, cancellationToken);

        var products = await dbContext.Products.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.IsActive && x.ReorderLevel > 0m)
            .Select(x => new { x.Id, x.Sku, x.Name, x.UnitOfMeasure, x.ReorderLevel })
            .ToListAsync(cancellationToken);

        var items = products
            .Select(product =>
            {
                var available = availableByProduct.GetValueOrDefault(product.Id);
                return new InventoryReorderRecommendationResponse(
                    product.Id,
                    product.Sku,
                    product.Name,
                    product.UnitOfMeasure,
                    available,
                    product.ReorderLevel,
                    Math.Max(0m, product.ReorderLevel - available));
            })
            .Where(x => x.ActiveWarehouseAvailable <= x.ReorderLevel)
            .OrderByDescending(x => x.SuggestedReorderQuantity)
            .ThenBy(x => x.Sku)
            .ToList();

        return ServiceResult<InventoryReorderReportResponse>.Success(new InventoryReorderReportResponse(DateTimeOffset.UtcNow, items.Count, items));
    }

    private static (string? Type, Guid? Id) GetSourceDocument(MovementAuditRow row)
    {
        if (row.PurchaseReceiptId.HasValue) return ("PurchaseReceipt", row.PurchaseReceiptId);
        if (row.SalesShipmentId.HasValue) return ("SalesShipment", row.SalesShipmentId);
        if (row.InventoryAdjustmentId.HasValue) return ("InventoryAdjustment", row.InventoryAdjustmentId);
        if (row.StockTransferId.HasValue) return ("StockTransfer", row.StockTransferId);
        if (row.PurchaseOrderId.HasValue) return ("PurchaseOrder", row.PurchaseOrderId);
        if (row.SalesOrderId.HasValue) return ("SalesOrder", row.SalesOrderId);
        if (row.PosRefundRecordId.HasValue) return ("PosRefund", row.PosRefundRecordId);
        return (null, null);
    }

    private sealed record ValuationBalanceRow(Guid ProductId, string Sku, string ProductName, string UnitOfMeasure, decimal CurrentStandardCost, Guid WarehouseId, string WarehouseCode, string WarehouseName, decimal QuantityOnHand);
    private sealed record ValuationMovementRow(Guid ProductId, string Sku, string ProductName, string UnitOfMeasure, decimal CurrentStandardCost, Guid WarehouseId, string WarehouseCode, string WarehouseName, decimal LedgerNetQuantity);
    internal sealed record MovementAuditRow(Guid Id, DateTime CreatedAtUtc, string MovementType, Guid ProductId, string Sku, string ProductName, Guid WarehouseId, string WarehouseCode, string WarehouseName, decimal Quantity, decimal QuantityOnHandDelta, decimal QuantityReservedDelta, string ReferenceNumber, Guid? PurchaseOrderId, Guid? SalesOrderId, Guid? InventoryAdjustmentId, Guid? StockTransferId, Guid? PurchaseReceiptId, Guid? SalesShipmentId, Guid? PosRefundRecordId);
}