namespace VexorionERP.Contracts;

public class PriorBalanceSheetSummaryResponse
{
    public DateOnly AsOfDate { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public decimal CurrentEarnings { get; set; }
    public decimal TotalLiabilitiesAndEquity { get; set; }
}
