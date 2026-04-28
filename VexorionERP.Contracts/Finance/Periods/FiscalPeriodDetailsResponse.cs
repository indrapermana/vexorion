namespace VexorionERP.Contracts;

public class FiscalPeriodDetailsResponse
{
    public Guid Id { get; set; }
    public string PeriodCode { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
}
