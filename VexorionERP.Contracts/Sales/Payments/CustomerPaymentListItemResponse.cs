namespace VexorionERP.Contracts.Sales.Payments;

public class CustomerPaymentListItemResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public string? PaymentMethod { get; set; }
    public bool IsActive { get; set; }
}
