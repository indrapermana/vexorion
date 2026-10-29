using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetAuditLogsQuery(
    string? EventType,
    string? EntityName,
    string? EntityId,
    string? CorrelationId,
    DateTime? FromUtc,
    DateTime? ToUtc,
    int Page,
    int PageSize) : IRequest<ServiceResult<AuditLogListResponse>>;

public sealed class GetAuditLogsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetAuditLogsQuery, ServiceResult<AuditLogListResponse>>
{
    public ValueTask<ServiceResult<AuditLogListResponse>> Handle(GetAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var auditLogQueryService = serviceProvider.GetRequiredService<IAuditLogQueryService>();
        return new ValueTask<ServiceResult<AuditLogListResponse>>(auditLogQueryService.GetAsync(
            request.EventType,
            request.EntityName,
            request.EntityId,
            request.CorrelationId,
            request.FromUtc,
            request.ToUtc,
            request.Page,
            request.PageSize,
            cancellationToken));
    }
}

public sealed record GetAdminLifecycleAuditLogsQuery(
    Guid TenantId,
    Guid? TargetUserId,
    bool TenantOnly,
    int Page,
    int PageSize) : IRequest<ServiceResult<AuditLogListResponse>>;

public sealed class GetAdminLifecycleAuditLogsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetAdminLifecycleAuditLogsQuery, ServiceResult<AuditLogListResponse>>
{
    public async ValueTask<ServiceResult<AuditLogListResponse>> Handle(
        GetAdminLifecycleAuditLogsQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantExists = await dbContext.Tenants
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.TenantId, cancellationToken);
        if (!tenantExists)
        {
            return ServiceResult<AuditLogListResponse>.Failure(404, "Tenant not found.");
        }

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var query = dbContext.AuditLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.TenantId == request.TenantId)
            .Where(x => x.EventType.StartsWith("users.")
                || x.EventType.StartsWith("roles.")
                || x.EventType.StartsWith("auth.")
                || x.EventType.StartsWith("tenants."));

        if (request.TargetUserId.HasValue)
        {
            query = query.Where(x => x.TargetUserId == request.TargetUserId.Value);
        }
        else if (request.TenantOnly)
        {
            query = query.Where(x => x.EventType.StartsWith("tenants."));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AuditLogListItemResponse
            {
                Id = x.Id,
                CreatedAtUtc = x.CreatedAtUtc,
                EventType = x.EventType,
                ActorUserId = x.ActorUserId,
                ActorUserName = x.ActorUser != null ? x.ActorUser.UserName : null,
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
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = items,
        });
    }
}
