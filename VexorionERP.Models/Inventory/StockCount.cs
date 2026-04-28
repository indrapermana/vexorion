using VexorionERP.Models;

namespace VexorionERP.Models;

public class StockCount : TenantEntityBase
{
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string? Notes { get; set; }

    public Warehouse? Warehouse { get; set; }
    public ICollection<StockCountLine> Lines { get; set; } = [];
}
