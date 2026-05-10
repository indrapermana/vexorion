using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectTimelineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IProjectTimelineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>> GetAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var tenantId = currentTenantProvider.TenantId.Value;

        var projectExists = await dbContext.Projects
            .GetByTenant(tenantId)
            .AnyAsync(x => x.Id == projectId, cancellationToken);

        if (!projectExists)
        {
            return ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>.Failure(StatusCodes.Status404NotFound, "Project not found.");
        }

        var projectIdText = projectId.ToString();
        var items = await dbContext.AuditLogs
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.EntityName == nameof(Project) && x.EntityId == projectIdText)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ProjectTimelineItemResponse
            {
                Id = x.Id,
                CreatedAtUtc = x.CreatedAtUtc,
                EventType = x.EventType,
                ActorUserId = x.ActorUserId,
                Description = x.Description,
                MetadataJson = x.MetadataJson
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>.Success(items);
    }
}
