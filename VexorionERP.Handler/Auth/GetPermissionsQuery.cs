using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPermissionsQuery : IRequest<ServiceResult<PermissionListResponse>>;
