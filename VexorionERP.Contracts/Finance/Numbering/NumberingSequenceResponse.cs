using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class NumberingSequenceResponse
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string PrefixTemplate { get; set; } = string.Empty;
    public int NextNumber { get; set; }
    public int NumberPadding { get; set; }
    public NumberingResetPeriod ResetPeriod { get; set; }
    public string? CurrentPeriodKey { get; set; }
}
