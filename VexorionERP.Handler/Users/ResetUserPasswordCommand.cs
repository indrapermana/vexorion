using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ResetUserPasswordCommand(Guid UserId, ResetPasswordRequest Request) : IRequest<ServiceResult<bool>>;
