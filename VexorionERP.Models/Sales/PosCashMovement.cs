namespace VexorionERP.Models;

public enum PosCashMovementType
{
    CashIn = 1,
    CashOut = 2,
}

public class PosCashMovement : TenantEntityBase
{
    public Guid ShiftId { get; set; }
    public Guid CashierId { get; set; }
    public PosCashMovementType Type { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
