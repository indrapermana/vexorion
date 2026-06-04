namespace VexorionERP.Contracts;

public class StorageUsageSummaryResponse
{
    public Guid TenantId { get; set; }
    public long UsedBytes { get; set; }
    public long ReservedBytes { get; set; }
    public long MaxStorageBytes { get; set; }
    public int UsedPercent { get; set; }
    public StorageThresholdStatus ThresholdStatus { get; set; }
    public DateTime LastCalculatedAtUtc { get; set; }
    public string? PlanCode { get; set; }
    public string? PlanName { get; set; }
}

public enum StorageThresholdStatus
{
    Normal = 0,
    Warning = 1,
    SoftBlock = 2,
    HardBlock = 3
}
