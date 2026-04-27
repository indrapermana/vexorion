namespace VexorionERP.Contracts.Finance.Reporting;

public class FinancialStatementLineResponse
{
    public Guid AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
