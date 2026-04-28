using VexorionERP.Models;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class DepartmentQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<Department>(currentTenantProvider);
