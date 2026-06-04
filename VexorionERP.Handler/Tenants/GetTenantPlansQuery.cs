using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantPlansQuery(Guid TenantId)
    : IRequest<ServiceResult<IReadOnlyCollection<TenantPlanResponse>>>;
