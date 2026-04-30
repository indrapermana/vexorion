using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record RefreshTokenCommand(RefreshTokenRequest Request) : IRequest<ServiceResult<LoginResponse>>;
