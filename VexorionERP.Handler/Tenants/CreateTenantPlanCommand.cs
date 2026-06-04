using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateTenantPlanCommand(Guid TenantId, CreateTenantPlanRequest Request, Guid? ActorUserId)
    : IRequest<ServiceResult<TenantPlanResponse>>;
