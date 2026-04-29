using VexorionERP.Models;
using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateInvoiceRequest : ICreateInput<Invoice>
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal AmountPaid { get; set; }
}
