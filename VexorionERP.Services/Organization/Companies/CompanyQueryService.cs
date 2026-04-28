using VexorionERP.Models;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CompanyQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<Company>(currentTenantProvider);
