using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteDepartmentCommand(Guid DepartmentId) : IRequest<ServiceResult<bool>>;
