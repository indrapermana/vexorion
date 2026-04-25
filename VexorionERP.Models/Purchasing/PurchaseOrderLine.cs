using VexorionERP.Models.Catalog;
using VexorionERP.Models.Common;

namespace VexorionERP.Models.Purchasing;

public class PurchaseOrderLine : TenantEntityBase
{
    public Guid PurchaseOrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal LineTotal => Quantity * UnitCost;

    public PurchaseOrder? PurchaseOrder { get; set; }
    public Product? Product { get; set; }
}