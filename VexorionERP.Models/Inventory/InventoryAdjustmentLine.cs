using VexorionERP.Models;

namespace VexorionERP.Models;

public class InventoryAdjustmentLine : TenantEntityBase
{
    public Guid InventoryAdjustmentId { get; set; }
    public Guid ProductId { get; set; }
    public decimal QuantityDelta { get; set; }
    public decimal UnitCost { get; set; }
    public string? Reason { get; set; }

    public InventoryAdjustment? InventoryAdjustment { get; set; }
    public Product? Product { get; set; }
}
