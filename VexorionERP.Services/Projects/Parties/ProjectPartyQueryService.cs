using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectPartyQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseLineQueryService<Project, ProjectParty>(currentTenantProvider)
{
    protected override string ParentNotFoundMessage => "Project not found.";

    protected override string LineNotFoundMessage => "Project party not found.";

    protected override Task<bool> ParentExistsAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        return context.Projects.GetByTenant(TenantId).AnyAsync(x => x.Id == parentId, cancellationToken);
    }

    protected override async Task<IReadOnlyCollection<IEntityListResponse<ProjectParty>>> GetAllForParentCoreAsync(
        Guid parentId,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var items = await context.ProjectParties
            .GetByTenant(TenantId)
            .AsNoTracking()
            .Include(party => party.RelatedTenant)
            .Where(x => x.ProjectId == parentId)
            .OrderBy(x => x.RelatedTenantId)
            .ThenBy(x => x.RelationshipType)
            .ToListAsync(cancellationToken);

        return items.Adapt<IReadOnlyCollection<ProjectPartyListItemResponse>>()
            .Cast<IEntityListResponse<ProjectParty>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<ProjectParty>?> GetByIdCoreAsync(
        Guid parentId,
        Guid lineId,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var entity = await context.ProjectParties
            .GetByTenant(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProjectId == parentId && x.Id == lineId, cancellationToken);

        return entity?.Adapt<ProjectPartyDetailsResponse>();
    }
}
