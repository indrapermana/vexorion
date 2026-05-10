using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseFilteredQueryService<Project, ProjectListFilterRequest>(currentTenantProvider)
{
    protected override ProjectListFilterRequest DefaultFilter => new();

    protected override IQueryable<Project> ApplyFilter(IQueryable<Project> query, ProjectListFilterRequest filter)
    {
        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        if (filter.RelatedTenantId.HasValue)
        {
            var relatedTenantId = filter.RelatedTenantId.Value;
            query = query.Where(x => x.Parties.Any(p => p.RelatedTenantId == relatedTenantId && p.IsActive));
        }

        return query;
    }

    protected override IQueryable<Project> ApplyOrdering(IQueryable<Project> query)
    {
        return query.OrderByDescending(x => x.StartDate).ThenBy(x => x.Name);
    }
}