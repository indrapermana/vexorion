using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTenantMenuConfigurationForTenantCommand(Guid TenantId, UpdateMenuConfigurationRequest Request)
    : IRequest<ServiceResult<TenantPreferencesResponse>>;
