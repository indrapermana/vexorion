using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Models.Purchasing;

public class PurchaseReceipt : TenantEntityBase
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public Guid PurchaseOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly ReceiptDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string? Notes { get; set; }

    public DateTimeOffset? PostedAtUtc { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<PurchaseReceiptLine> Lines { get; set; } = [];
}
