using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateTenantPlanRequest
{
    [Required, MaxLength(50)]
    public string PlanCode { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string PlanName { get; set; } = string.Empty;

    [Range(1, long.MaxValue)]
    public long MaxStorageBytes { get; set; }

    [Range(1, long.MaxValue)]
    public long MaxFileSizeBytes { get; set; }

    [Range(1, 100)]
    public int WarningThresholdPercent { get; set; } = 80;

    [Range(1, 100)]
    public int SoftBlockThresholdPercent { get; set; } = 95;

    [Range(1, 100)]
    public int HardBlockThresholdPercent { get; set; } = 100;

    public DateTime EffectiveFromUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsDefault { get; set; }
}
