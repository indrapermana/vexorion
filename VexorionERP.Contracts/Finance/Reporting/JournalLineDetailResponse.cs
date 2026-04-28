namespace VexorionERP.Contracts;

public class JournalLineDetailResponse
{
    public Guid JournalEntryId { get; set; }
    public string JournalNumber { get; set; } = string.Empty;
    public DateOnly PostingDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
}
