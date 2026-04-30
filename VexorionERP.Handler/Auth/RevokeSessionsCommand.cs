using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record RevokeSessionsCommand : IRequest<ServiceResult<bool>>;
