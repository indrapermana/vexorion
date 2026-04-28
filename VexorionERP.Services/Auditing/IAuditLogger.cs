namespace VexorionERP.Services;

public interface IAuditLogger
{
    Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId, string? entityName, string? entityId, string? description, object? metadata = null, CancellationToken cancellationToken = default);
}
