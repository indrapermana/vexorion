namespace VexorionERP.Contracts;

public class ProjectAssignmentHistoryItemResponse
{
    public Guid AuditLogId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ActorUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? MetadataJson { get; set; }
}
