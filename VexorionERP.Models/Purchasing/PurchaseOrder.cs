using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;

namespace VexorionERP.Models.Purchasing;

public class PurchaseOrder : TenantEntityBase
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly ExpectedReceiptDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string CurrencyCode { get; set; } = "USD";
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }

    public Supplier? Supplier { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<PurchaseOrderLine> Lines { get; set; } = [];
    public ICollection<PurchaseReceipt> Receipts { get; set; } = [];
}