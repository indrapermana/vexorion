namespace VexorionERP.Contracts;

public class TrialBalanceReportResponse
{
    public DateOnly AsOfDate { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal EndingDebitTotal { get; set; }
    public decimal EndingCreditTotal { get; set; }
    public IReadOnlyCollection<TrialBalanceLineResponse> Lines { get; set; } = [];
}
