namespace VexorionERP.Contracts;

public class TenantPlanResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string PlanCode { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public long MaxStorageBytes { get; set; }
    public long MaxFileSizeBytes { get; set; }
    public int WarningThresholdPercent { get; set; }
    public int SoftBlockThresholdPercent { get; set; }
    public int HardBlockThresholdPercent { get; set; }
    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}
