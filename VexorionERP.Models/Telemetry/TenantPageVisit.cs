using VexorionERP.Models;

namespace VexorionERP.Models;

public class TenantPageVisit : TenantEntityBase
{
    public string Path { get; set; } = string.Empty;
    public DateOnly VisitDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public int VisitCount { get; set; }
    public DateTime LastVisitedAtUtc { get; set; } = DateTime.UtcNow;
}
