namespace VexorionERP.Models;

public class ShiftSession : TenantEntityBase
{
    /// <summary>The user who opened this shift.</summary>
    public Guid CashierId { get; set; }

    /// <summary>Display name captured at shift-open time (snapshot).</summary>
    public string CashierName { get; set; } = string.Empty;

    public DateTime OpenedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; set; }

    /// <summary>Cash amount counted into the till at opening.</summary>
    public decimal OpeningFloat { get; set; }

    /// <summary>Cash amount physically counted in the till at closing.</summary>
    public decimal? CountedCash { get; set; }

    public string CurrencyCode { get; set; } = "USD";

    public ShiftStatus Status { get; set; } = ShiftStatus.Open;

    public string? Notes { get; set; }
}
