namespace VexorionERP.Contracts.Finance.Periods;

public class UpdateFiscalPeriodRequest
{
    public string PeriodCode { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsClosed { get; set; }
}
