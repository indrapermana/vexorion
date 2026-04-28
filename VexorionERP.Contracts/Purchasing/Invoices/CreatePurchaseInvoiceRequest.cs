using VexorionERP.Models;
using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreatePurchaseInvoiceRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public Guid? SourcePurchaseOrderId { get; set; }
    public Guid? SourcePurchaseReceiptId { get; set; }
    [StringLength(100)]
    public string? VendorReferenceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public Guid? PaymentTermId { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";
    [StringLength(1000)]
    public string? Notes { get; set; }
}
