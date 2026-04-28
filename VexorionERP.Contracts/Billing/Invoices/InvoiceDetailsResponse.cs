using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class InvoiceDetailsResponse : IEntityResponse<Invoice>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public bool IsActive { get; set; }
}
