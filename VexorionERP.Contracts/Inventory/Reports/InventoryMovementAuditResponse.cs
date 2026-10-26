namespace VexorionERP.Contracts;

/// <summary>A page of inventory movement audit entries.</summary>
public sealed record InventoryMovementAuditResponse(
    int Skip,
    int Take,
    int TotalCount,
    IReadOnlyCollection<InventoryMovementAuditItemResponse> Items);

/// <summary>One signed inventory movement with its source and timestamp.</summary>
public sealed record InventoryMovementAuditItemResponse(
    Guid Id,
    DateTimeOffset CreatedAtUtc,
    string MovementType,
    Guid ProductId,
    string Sku,
    string ProductName,
    Guid WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal Quantity,
    decimal QuantityOnHandDelta,
    decimal QuantityReservedDelta,
    string ReferenceNumber,
    string? SourceDocumentType,
    Guid? SourceDocumentId);