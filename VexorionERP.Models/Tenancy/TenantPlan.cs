using VexorionERP.Models;

namespace VexorionERP.Models;

public class TenantPlan : TenantEntityBase
{
    public string PlanCode { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public long MaxStorageBytes { get; set; }
    public long MaxFileSizeBytes { get; set; }
    public int WarningThresholdPercent { get; set; } = 80;
    public int SoftBlockThresholdPercent { get; set; } = 95;
    public int HardBlockThresholdPercent { get; set; } = 100;
    public DateTime EffectiveFromUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsDefault { get; set; }
}