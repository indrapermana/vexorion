namespace VexorionERP.Contracts;

public class BalanceSheetReportResponse
{
    public DateOnly AsOfDate { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public decimal CurrentEarnings { get; set; }
    public decimal TotalLiabilitiesAndEquity { get; set; }
    public IReadOnlyCollection<FinancialStatementLineResponse> AssetLines { get; set; } = [];
    public IReadOnlyCollection<FinancialStatementLineResponse> LiabilityLines { get; set; } = [];
    public IReadOnlyCollection<FinancialStatementLineResponse> EquityLines { get; set; } = [];
    public PriorBalanceSheetSummaryResponse? PriorPeriod { get; set; }
}
