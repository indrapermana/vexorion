using VexorionERP.Models.Common;
using VexorionERP.Models.Partners;

namespace VexorionERP.Models.Purchasing;

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