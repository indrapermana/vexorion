using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record OnboardTenantCommand(OnboardTenantRequest Request) : IRequest<ServiceResult<OnboardTenantResponse>>;
