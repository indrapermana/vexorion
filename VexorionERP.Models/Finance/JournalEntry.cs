using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;

namespace VexorionERP.Models.Finance;

public class JournalEntry : TenantEntityBase
{
    public string JournalNumber { get; set; } = string.Empty;
    public string SourceDocumentType { get; set; } = string.Empty;
    public Guid? SourceDocumentId { get; set; }
    public DateOnly PostingDate { get; set; }
    public Guid FiscalPeriodId { get; set; }
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public Guid? ReversedJournalEntryId { get; set; }
    public string? Description { get; set; }

    public FiscalPeriod? FiscalPeriod { get; set; }
    public JournalEntry? ReversedJournalEntry { get; set; }
    public ICollection<JournalEntry> ReversalEntries { get; set; } = [];
    public ICollection<JournalEntryLine> Lines { get; set; } = [];
}