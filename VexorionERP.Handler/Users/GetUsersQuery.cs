using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetUsersQuery : IRequest<ServiceResult<IReadOnlyCollection<UserListItemResponse>>>;
