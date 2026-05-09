using VexorionERP.Models;

namespace VexorionERP.Models;

public class StorageUsageLedger : TenantEntityBase
{
    public Guid? ProjectId { get; set; }
    public Guid? ProjectDocumentId { get; set; }
    public string OperationType { get; set; } = string.Empty;
    public long DeltaBytes { get; set; }
    public long ResultingUsedBytes { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public string? Reference { get; set; }

    public Project? Project { get; set; }
    public ProjectDocument? ProjectDocument { get; set; }
    public User? PerformedByUser { get; set; }
}