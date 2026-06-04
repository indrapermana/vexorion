using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ConsultantQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseQueryService<Consultant>(currentTenantProvider);
