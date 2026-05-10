namespace VexorionERP.Contracts;

public class ProjectTimelineItemResponse
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string EventType { get; set; } = string.Empty;
    public Guid? ActorUserId { get; set; }
    public string? Description { get; set; }
    public string? MetadataJson { get; set; }
}
