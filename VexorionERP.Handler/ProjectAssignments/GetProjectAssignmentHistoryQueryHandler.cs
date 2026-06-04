using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectAssignmentHistoryQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectAssignmentHistoryQuery, ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>> Handle(GetProjectAssignmentHistoryQuery request, CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>.Failure(400, "Tenant context is required.");
        }

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = tenantProvider.TenantId.Value;

        var projectExists = await dbContext.Projects
            .GetByTenant(tenantId)
            .AnyAsync(x => x.Id == request.ProjectId, cancellationToken);

        if (!projectExists)
        {
            return ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>.Failure(404, "Project not found.");
        }

        var items = await dbContext.AuditLogs
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.EntityName == nameof(Project)
                && x.EntityId == request.ProjectId.ToString()
                && x.EventType.StartsWith("project.assignment."))
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ProjectAssignmentHistoryItemResponse
            {
                AuditLogId = x.Id,
                EventType = x.EventType,
                Description = x.Description,
                ActorUserId = x.ActorUserId,
                CreatedAtUtc = x.CreatedAtUtc,
                MetadataJson = x.MetadataJson
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>.Success(items);
    }
}
