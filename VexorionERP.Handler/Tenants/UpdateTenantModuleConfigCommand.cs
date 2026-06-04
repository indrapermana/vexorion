using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTenantModuleConfigCommand(Guid TenantId, UpdateTenantModuleConfigRequest Request, Guid UpdatedByUserId)
    : IRequest<ServiceResult<TenantModuleConfigResponse>>;
