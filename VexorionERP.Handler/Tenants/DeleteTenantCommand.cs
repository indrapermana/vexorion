using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteTenantCommand(Guid TenantId) : IRequest<ServiceResult<bool>>;
