using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record AssignUserRolesCommand(Guid UserId, AssignUserRolesRequest Request) : IRequest<ServiceResult<bool>>;
