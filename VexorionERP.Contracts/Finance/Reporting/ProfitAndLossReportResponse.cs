namespace VexorionERP.Contracts.Finance.Reporting;

public class ProfitAndLossReportResponse
{
    public DateOnly PeriodStartDate { get; set; }
    public DateOnly PeriodEndDate { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetIncome { get; set; }
    public IReadOnlyCollection<FinancialStatementLineResponse> RevenueLines { get; set; } = [];
    public IReadOnlyCollection<FinancialStatementLineResponse> ExpenseLines { get; set; } = [];
    public PriorPeriodSummaryResponse? PriorPeriod { get; set; }
}
