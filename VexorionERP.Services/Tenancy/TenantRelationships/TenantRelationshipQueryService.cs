using VexorionERP.Models;
using VexorionERP.Database;

namespace VexorionERP.Services;

public class TenantRelationshipQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<TenantRelationship>(currentTenantProvider)
{
}
