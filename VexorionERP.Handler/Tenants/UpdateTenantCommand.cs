using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTenantCommand(Guid TenantId, UpdateTenantRequest Request)
    : IRequest<ServiceResult<TenantListItemResponse>>;
