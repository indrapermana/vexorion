using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateEmployeeCommand(Guid EmployeeId, UpdateEmployeeRequest Request) : IRequest<ServiceResult<EmployeeDetailsResponse>>;
