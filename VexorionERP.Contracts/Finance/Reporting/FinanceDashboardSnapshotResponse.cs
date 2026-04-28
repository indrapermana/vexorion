namespace VexorionERP.Contracts;

public class FinanceDashboardSnapshotResponse
{
    public DateOnly AsOfDate { get; set; }
    public DateOnly PeriodStartDate { get; set; }
    public int PeriodDays { get; set; }
    public decimal ReceivablesOpen { get; set; }
    public decimal ReceivablesOverdue { get; set; }
    public decimal PayablesOpen { get; set; }
    public decimal PayablesOverdue { get; set; }
    public decimal RevenueInPeriod { get; set; }
    public decimal CashInInPeriod { get; set; }
    public decimal CashOutInPeriod { get; set; }
    public decimal NetCashInPeriod { get; set; }
}
