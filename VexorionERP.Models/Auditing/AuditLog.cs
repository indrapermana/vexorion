using VexorionERP.Models.Common;

namespace VexorionERP.Models.Auditing;

public class AuditLog : TenantEntityBase
{
    public string EventType { get; set; } = string.Empty;
    public Guid? ActorUserId { get; set; }
    public Guid? TargetUserId { get; set; }
    public string? EntityName { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? MetadataJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public Identity.User? ActorUser { get; set; }
    public Identity.User? TargetUser { get; set; }
}