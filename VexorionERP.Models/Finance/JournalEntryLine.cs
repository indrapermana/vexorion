using VexorionERP.Models;

namespace VexorionERP.Models;

public class JournalEntryLine : TenantEntityBase
{
    public Guid JournalEntryId { get; set; }
    public Guid AccountId { get; set; }
    public int LineNumber { get; set; }
    public string? Description { get; set; }
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }

    public JournalEntry? JournalEntry { get; set; }
    public Account? Account { get; set; }
}
