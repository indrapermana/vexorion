using VexorionERP.Models;

namespace VexorionERP.Models;

public class StorageUsageSummary : TenantEntityBase
{
    public long UsedBytes { get; set; }
    public long ReservedBytes { get; set; }
    public DateTime LastCalculatedAtUtc { get; set; } = DateTime.UtcNow;
}