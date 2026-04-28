using VexorionERP.Models;

namespace VexorionERP.Models;

public class NumberingSequence : TenantEntityBase
{
    public string DocumentType { get; set; } = string.Empty;
    public string PrefixTemplate { get; set; } = string.Empty;
    public int NextNumber { get; set; } = 1;
    public int NumberPadding { get; set; } = 4;
    public NumberingResetPeriod ResetPeriod { get; set; } = NumberingResetPeriod.None;
    public string? CurrentPeriodKey { get; set; }
}
