using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantModuleConfigQuery(Guid TenantId)
    : IRequest<ServiceResult<TenantModuleConfigResponse>>;
