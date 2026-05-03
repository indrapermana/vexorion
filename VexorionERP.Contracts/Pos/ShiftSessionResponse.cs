using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ShiftSessionResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public DateTime OpenedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public decimal OpeningFloat { get; set; }
    public decimal? CountedCash { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public ShiftStatus Status { get; set; }
    public string? Notes { get; set; }
}
