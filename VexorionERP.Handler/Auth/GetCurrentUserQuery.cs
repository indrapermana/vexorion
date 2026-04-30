using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetCurrentUserQuery : IRequest<ServiceResult<CurrentUserResponse>>;
