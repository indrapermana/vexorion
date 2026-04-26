namespace VexorionERP.Contracts.Finance.Reporting;

public class TrialBalanceLineResponse
{
    public Guid AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal EndingDebit { get; set; }
    public decimal EndingCredit { get; set; }
}
