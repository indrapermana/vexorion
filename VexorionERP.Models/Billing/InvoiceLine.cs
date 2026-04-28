using VexorionERP.Models;

namespace VexorionERP.Models;

public class InvoiceLine : TenantEntityBase
{
    public Guid InvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal => (Quantity * UnitPrice) + TaxAmount;

    public Invoice? Invoice { get; set; }
    public Product? Product { get; set; }
}
