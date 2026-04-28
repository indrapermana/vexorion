using VexorionERP.Models;

namespace VexorionERP.Models;

public class InventoryAdjustment : TenantEntityBase
{
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly AdjustmentDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public Warehouse? Warehouse { get; set; }
    public ICollection<InventoryAdjustmentLine> Lines { get; set; } = [];
}
