namespace VexorionERP.Contracts;

public class AccountDrillDownResponse
{
    public Guid AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public DateOnly? PeriodStartDate { get; set; }
    public DateOnly PeriodEndDate { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public IReadOnlyCollection<JournalLineDetailResponse> Lines { get; set; } = [];
}
