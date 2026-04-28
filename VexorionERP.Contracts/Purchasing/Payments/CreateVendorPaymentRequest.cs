using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateVendorPaymentRequest
{
    public Guid SupplierId { get; set; }
    public Guid PurchaseInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; set; }
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";
    [StringLength(50)]
    public string? ReferenceNumber { get; set; }
    [StringLength(50)]
    public string? PaymentMethod { get; set; }
    [StringLength(1000)]
    public string? Notes { get; set; }
}
