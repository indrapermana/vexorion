namespace VexorionERP.Contracts;

public class PosCheckoutResponse
{
    public Guid SalesOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid SalesShipmentId { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid SalesInvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid? CustomerPaymentId { get; set; }
    public Guid ShiftId { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal GrandTotal { get; set; }
    public decimal AmountTendered { get; set; }
    public decimal AmountApplied { get; set; }
    public decimal ChangeDue { get; set; }
    public DateTimeOffset CompletedAtUtc { get; set; }

    /// <summary>True when this response replays a checkout that had already completed for the same idempotency key.</summary>
    public bool Replayed { get; set; }
}
