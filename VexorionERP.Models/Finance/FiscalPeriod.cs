using VexorionERP.Models.Common;

namespace VexorionERP.Models.Finance;

public class FiscalPeriod : TenantEntityBase
{
    public string PeriodCode { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedAtUtc { get; set; }

    public ICollection<JournalEntry> JournalEntries { get; set; } = [];
}