using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantsQuery() : IRequest<ServiceResult<IReadOnlyCollection<TenantListItemResponse>>>;
