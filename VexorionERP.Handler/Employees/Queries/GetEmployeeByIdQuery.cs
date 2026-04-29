using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetEmployeeByIdQuery(Guid EmployeeId) : IRequest<ServiceResult<EmployeeDetailsResponse>>;
