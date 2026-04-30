using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UnlockUserCommand(Guid UserId) : IRequest<ServiceResult<bool>>;
