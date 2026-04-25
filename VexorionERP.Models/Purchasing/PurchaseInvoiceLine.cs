using VexorionERP.Models.Catalog;
using VexorionERP.Models.Common;
using VexorionERP.Models.Finance;

namespace VexorionERP.Models.Purchasing;

public class PurchaseInvoiceLine : TenantEntityBase
{
    public Guid PurchaseInvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? TaxCodeId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineSubtotal => (Quantity * UnitCost) - DiscountAmount;
    public decimal LineTotal => LineSubtotal + TaxAmount;

    public PurchaseInvoice? PurchaseInvoice { get; set; }
    public Product? Product { get; set; }
    public TaxCode? TaxCode { get; set; }
}