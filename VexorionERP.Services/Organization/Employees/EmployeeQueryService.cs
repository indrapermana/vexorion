using VexorionERP.Models;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class EmployeeQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<Employee>(currentTenantProvider);
