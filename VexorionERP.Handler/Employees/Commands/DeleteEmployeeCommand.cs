using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteEmployeeCommand(Guid EmployeeId) : IRequest<ServiceResult<bool>>;
