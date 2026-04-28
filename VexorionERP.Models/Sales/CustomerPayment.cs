using VexorionERP.Models;

namespace VexorionERP.Models;

public class CustomerPayment : TenantEntityBase
{
    public Guid CustomerId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public string? ReferenceNumber { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }

    public Customer? Customer { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }
}
