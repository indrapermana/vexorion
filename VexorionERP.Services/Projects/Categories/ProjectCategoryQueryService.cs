using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectCategoryQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<ProjectCategory>(currentTenantProvider)
{
}
