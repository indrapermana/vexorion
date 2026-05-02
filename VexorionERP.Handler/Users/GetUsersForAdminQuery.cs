using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetUsersForAdminQuery(Guid? TenantId) : IRequest<ServiceResult<IReadOnlyCollection<UserListItemResponse>>>;
