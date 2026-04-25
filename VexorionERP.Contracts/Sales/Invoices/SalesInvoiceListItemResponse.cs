using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Sales.Invoices;

public class SalesInvoiceListItemResponse
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
    public decimal TaxTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidTotal { get; set; }
    public decimal BalanceDue { get; set; }
    public bool IsActive { get; set; }
}
