using VexorionERP.Models;

namespace VexorionERP.Models;

public class PurchaseReceiptLine : TenantEntityBase
{
    public Guid PurchaseReceiptId { get; set; }
    public Guid PurchaseOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal UnitCost { get; set; }

    public PurchaseReceipt? PurchaseReceipt { get; set; }
    public PurchaseOrderLine? PurchaseOrderLine { get; set; }
    public Product? Product { get; set; }
}
