namespace VexorionERP.Contracts;

/// <summary>Reorder recommendations based on active-warehouse available stock.</summary>
public sealed record InventoryReorderReportResponse(
    DateTimeOffset GeneratedAtUtc,
    int RecommendationCount,
    IReadOnlyCollection<InventoryReorderRecommendationResponse> Items);

/// <summary>One product's available quantity and gap to its reorder level.</summary>
public sealed record InventoryReorderRecommendationResponse(
    Guid ProductId,
    string Sku,
    string ProductName,
    string UnitOfMeasure,
    decimal ActiveWarehouseAvailable,
    decimal ReorderLevel,
    decimal SuggestedReorderQuantity);