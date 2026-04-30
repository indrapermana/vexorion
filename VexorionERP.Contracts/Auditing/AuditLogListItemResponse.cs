using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class AuditLogListItemResponse : IEntityListResponse<AuditLog>
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string EventType { get; set; } = string.Empty;
    public Guid? ActorUserId { get; set; }
    public Guid? TargetUserId { get; set; }
    public string? EntityName { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? MetadataJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
