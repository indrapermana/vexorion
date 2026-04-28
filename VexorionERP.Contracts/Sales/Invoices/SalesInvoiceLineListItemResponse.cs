namespace VexorionERP.Contracts;

public class SalesInvoiceLineListItemResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? TaxCodeId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsActive { get; set; }
}
