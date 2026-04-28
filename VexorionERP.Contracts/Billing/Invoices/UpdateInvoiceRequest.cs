using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateInvoiceRequest
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string CurrencyCode { get; set; } = "USD";
    public decimal AmountPaid { get; set; }
    public bool IsActive { get; set; } = true;
}
