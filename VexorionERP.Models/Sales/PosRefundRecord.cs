namespace VexorionERP.Models;

public class PosRefundRecord : TenantEntityBase
{
    public Guid IdempotencyKey { get; set; }
    public Guid CashierId { get; set; }
    public Guid ShiftId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public Guid CreditNoteId { get; set; }
    public Guid? RefundPaymentId { get; set; }
    public string RequestHash { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public decimal TotalCreditAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal AppliedCreditAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTimeOffset CompletedAtUtc { get; set; }
    public string ResponseJson { get; set; } = string.Empty;

    public ICollection<PosRefundLine> Lines { get; set; } = [];
}