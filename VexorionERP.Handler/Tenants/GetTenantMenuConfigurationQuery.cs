using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantMenuConfigurationQuery(Guid TenantId)
    : IRequest<ServiceResult<TenantPreferencesResponse>>;
