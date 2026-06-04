using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectDocumentQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseFilteredQueryService<ProjectDocument, ProjectDocumentListFilterRequest>(currentTenantProvider)
{
    protected override ProjectDocumentListFilterRequest DefaultFilter => new();

    protected override IQueryable<ProjectDocument> ApplyFilter(IQueryable<ProjectDocument> query, ProjectDocumentListFilterRequest filter)
    {
        if (filter.ProjectId.HasValue)
            query = query.Where(x => x.ProjectId == filter.ProjectId.Value);

        if (filter.DocumentFolderId.HasValue)
            query = query.Where(x => x.DocumentFolderId == filter.DocumentFolderId.Value);

        if (filter.Status.HasValue)
            query = query.Where(x => x.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.Title.ToLower().Contains(term) ||
                x.DocumentNumber.ToLower().Contains(term) ||
                x.FileName.ToLower().Contains(term) ||
                (x.Tags != null && x.Tags.ToLower().Contains(term)));
        }

        return query;
    }

    protected override IQueryable<ProjectDocument> ApplyOrdering(IQueryable<ProjectDocument> query)
        => query.OrderByDescending(x => x.CurrentVersionNumber).ThenBy(x => x.Title);
}
