namespace VexorionERP.Contracts;

public class PosCheckoutRequest
{
    /// <summary>Client-generated key, created once per checkout attempt and reused on retry.</summary>
    public Guid IdempotencyKey { get; set; }
    public Guid ShiftId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid WarehouseId { get; set; }
    public bool IsDelivery { get; set; }
    public string? Notes { get; set; }
    public string? PaymentMethod { get; set; }
    public decimal PaymentAmount { get; set; }
    public List<PosCheckoutLine> Lines { get; set; } = [];
}

public class PosCheckoutLine
{
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
}
