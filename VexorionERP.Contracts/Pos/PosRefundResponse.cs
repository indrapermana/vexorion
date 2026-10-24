namespace VexorionERP.Contracts;

public class PosRefundResponse
{
    public Guid RefundId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public Guid CreditNoteId { get; set; }
    public Guid? RefundPaymentId { get; set; }
    public string CreditNoteNumber { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal TotalCreditAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal AppliedCreditAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTimeOffset CompletedAtUtc { get; set; }
    public bool Replayed { get; set; }
    public List<PosRefundLineResponse> Lines { get; set; } = [];
}

public class PosRefundLineResponse
{
    public Guid SalesInvoiceLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public bool ReturnedToStock { get; set; }
}