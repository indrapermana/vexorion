using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductCategoryQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<ProductCategory>(currentTenantProvider)
{
}
