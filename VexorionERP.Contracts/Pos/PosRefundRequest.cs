namespace VexorionERP.Contracts;

public class PosRefundRequest
{
    public Guid IdempotencyKey { get; set; }
    public Guid ShiftId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<PosRefundLineRequest> Lines { get; set; } = [];
}

public class PosRefundLineRequest
{
    public Guid SalesInvoiceLineId { get; set; }
    public decimal Quantity { get; set; }
    public bool ReturnToStock { get; set; }
}