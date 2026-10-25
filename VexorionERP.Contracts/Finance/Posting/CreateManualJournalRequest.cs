namespace VexorionERP.Contracts;

public sealed class CreateManualJournalRequest
{
    public DateOnly PostingDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public IReadOnlyCollection<CreateManualJournalLineRequest> Lines { get; set; } = [];
}

public sealed class CreateManualJournalLineRequest
{
    public Guid AccountId { get; set; }
    public string? Description { get; set; }
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
}
