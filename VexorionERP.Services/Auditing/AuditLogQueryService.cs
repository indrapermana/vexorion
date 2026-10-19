using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class AuditLogQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IAuditLogQueryService
{
    public async Task<ServiceResult<AuditLogListResponse>> GetAsync(
        string? eventType,
        string? entityName,
        DateTime? fromUtc,
        DateTime? toUtc,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<AuditLogListResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var tenantId = currentTenantProvider.TenantId.Value;
        var normalizedPage = Math.Max(1, page);
        var normalizedPageSize = Math.Clamp(pageSize, 1, 200);

        var query = dbContext.AuditLogs
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            var eventFilter = eventType.Trim();
            query = query.Where(x => x.EventType.Contains(eventFilter));
        }

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            var entityFilter = entityName.Trim();
            query = query.Where(x => x.EntityName != null && x.EntityName.Contains(entityFilter));
        }

        if (fromUtc.HasValue)
            query = query.Where(x => x.CreatedAtUtc >= fromUtc.Value);

        if (toUtc.HasValue)
            query = query.Where(x => x.CreatedAtUtc <= toUtc.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .Select(x => new AuditLogListItemResponse
            {
                Id = x.Id,
                CreatedAtUtc = x.CreatedAtUtc,
                EventType = x.EventType,
                ActorUserId = x.ActorUserId,
                TargetUserId = x.TargetUserId,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                Description = x.Description,
                MetadataJson = x.MetadataJson,
                CorrelationId = x.CorrelationId,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<AuditLogListResponse>.Success(new AuditLogListResponse
        {
            Page = normalizedPage,
            PageSize = normalizedPageSize,
            TotalCount = totalCount,
            Items = items,
        });
    }
}
