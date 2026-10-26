namespace VexorionERP.Contracts;

/// <summary>Current inventory valuation using each product's current standard cost.</summary>
public sealed record InventoryValuationReportResponse(
    DateTimeOffset GeneratedAtUtc,
    decimal TotalEstimatedValue,
    int ReconciledItemCount,
    int UnreconciledItemCount,
    IReadOnlyCollection<InventoryValuationItemResponse> Items);

/// <summary>Valuation and movement reconciliation for one product in one warehouse.</summary>
public sealed record InventoryValuationItemResponse(
    Guid ProductId,
    string Sku,
    string ProductName,
    string UnitOfMeasure,
    Guid WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal QuantityOnHand,
    decimal CurrentStandardCost,
    decimal EstimatedValue,
    decimal LedgerNetQuantity,
    decimal BalanceToLedgerVariance);