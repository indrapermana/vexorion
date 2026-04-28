using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class PurchaseInvoiceLineListItemResponse : IEntityListResponse<PurchaseInvoiceLine>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid PurchaseInvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? TaxCodeId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsActive { get; set; }
}
