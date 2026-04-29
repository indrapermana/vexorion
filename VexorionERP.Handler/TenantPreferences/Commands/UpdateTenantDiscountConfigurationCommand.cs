using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTenantDiscountConfigurationCommand(UpdateDiscountConfigurationRequest Request)
    : IRequest<ServiceResult<TenantPreferencesResponse>>;
