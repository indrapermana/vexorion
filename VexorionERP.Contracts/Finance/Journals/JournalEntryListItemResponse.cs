using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Finance.Journals;

public class JournalEntryListItemResponse
{
    public Guid Id { get; set; }
    public string JournalNumber { get; set; } = string.Empty;
    public string SourceDocumentType { get; set; } = string.Empty;
    public Guid? SourceDocumentId { get; set; }
    public DateOnly PostingDate { get; set; }
    public JournalEntryStatus Status { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
}
