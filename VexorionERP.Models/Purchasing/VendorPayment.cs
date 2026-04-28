using VexorionERP.Models;

namespace VexorionERP.Models;

public class VendorPayment : TenantEntityBase
{
    public Guid SupplierId { get; set; }
    public Guid PurchaseInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public string? ReferenceNumber { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }

    public Supplier? Supplier { get; set; }
    public PurchaseInvoice? PurchaseInvoice { get; set; }
}
