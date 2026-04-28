using VexorionERP.Models;

namespace VexorionERP.Models;

public class SalesInvoiceLine : TenantEntityBase
{
    public Guid SalesInvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? TaxCodeId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineSubtotal => (Quantity * UnitPrice) - DiscountAmount;
    public decimal LineTotal => LineSubtotal + TaxAmount;

    public SalesInvoice? SalesInvoice { get; set; }
    public Product? Product { get; set; }
    public TaxCode? TaxCode { get; set; }
}
