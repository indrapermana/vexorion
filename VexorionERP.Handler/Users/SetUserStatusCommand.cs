using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record SetUserStatusCommand(Guid UserId, DisableUserRequest Request) : IRequest<ServiceResult<bool>>;
