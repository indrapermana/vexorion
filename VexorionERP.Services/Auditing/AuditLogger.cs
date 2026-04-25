using Microsoft.AspNetCore.Http;
using System.Text.Json;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Auditing;

namespace VexorionERP.Services;

public class AuditLogger(
    AppDbContext dbContext,
    IHttpContextAccessor httpContextAccessor,
    ICurrentTenantProvider currentTenantProvider) : IAuditLogger
{
    public async Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId, string? entityName, string? entityId, string? description, object? metadata = null, CancellationToken cancellationToken = default)
    {
        var resolvedTenantId = tenantId ?? currentTenantProvider.TenantId;
        if (!resolvedTenantId.HasValue)
        {
            return;
        }

        var request = httpContextAccessor.HttpContext?.Request;
        dbContext.Set<AuditLog>().Add(new AuditLog
        {
            TenantId = resolvedTenantId.Value,
            EventType = eventType,
            ActorUserId = actorUserId,
            TargetUserId = targetUserId,
            EntityName = entityName,
            EntityId = entityId,
            Description = description,
            MetadataJson = metadata is null ? null : JsonSerializer.Serialize(metadata),
            IpAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = request?.Headers.UserAgent.ToString()
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}