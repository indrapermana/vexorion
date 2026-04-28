using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductQueryService(ICurrentTenantProvider currentTenantProvider) : BaseQueryService<Product>(currentTenantProvider)
{
}
