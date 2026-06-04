using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class DocumentFolderQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseFilteredQueryService<DocumentFolder, DocumentFolderListFilterRequest>(currentTenantProvider)
{
    protected override DocumentFolderListFilterRequest DefaultFilter => new();

    protected override IQueryable<DocumentFolder> ApplyFilter(IQueryable<DocumentFolder> query, DocumentFolderListFilterRequest filter)
    {
        if (filter.ProjectId.HasValue)
            query = query.Where(x => x.ProjectId == filter.ProjectId.Value);

        if (filter.ParentFolderId.HasValue)
            query = query.Where(x => x.ParentFolderId == filter.ParentFolderId.Value);

        return query;
    }

    protected override IQueryable<DocumentFolder> ApplyOrdering(IQueryable<DocumentFolder> query)
        => query.OrderBy(x => x.Name);
}
