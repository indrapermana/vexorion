using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Partners;

namespace VexorionERP.Models.Purchasing;

public class PurchaseInvoice : TenantEntityBase
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public Guid? SourcePurchaseOrderId { get; set; }
    public Guid? SourcePurchaseReceiptId { get; set; }
    public string? VendorReferenceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public Guid? PaymentTermId { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidTotal { get; set; }
    public decimal BalanceDue => GrandTotal - PaidTotal;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateTime? PostedAtUtc { get; set; }
    public DateTime? ReversedAtUtc { get; set; }
    public string? Notes { get; set; }

    public Supplier? Supplier { get; set; }
    public PurchaseOrder? SourcePurchaseOrder { get; set; }
    public PaymentTerm? PaymentTerm { get; set; }
    public ICollection<PurchaseInvoiceLine> Lines { get; set; } = [];
}