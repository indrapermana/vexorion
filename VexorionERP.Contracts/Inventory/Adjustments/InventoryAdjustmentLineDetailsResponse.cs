namespace VexorionERP.Contracts.Inventory.Adjustments;

public class InventoryAdjustmentLineDetailsResponse
{
    public Guid Id { get; set; }
    public Guid InventoryAdjustmentId { get; set; }
    public Guid ProductId { get; set; }
    public decimal QuantityDelta { get; set; }
    public decimal UnitCost { get; set; }
    public string? Reason { get; set; }
    public bool IsActive { get; set; }
}