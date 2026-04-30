using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateUserCommand(CreateUserRequest Request) : IRequest<ServiceResult<UserListItemResponse>>;
