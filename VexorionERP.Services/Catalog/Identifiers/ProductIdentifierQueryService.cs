using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductIdentifierQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<ProductIdentifier>(currentTenantProvider)
{
}
