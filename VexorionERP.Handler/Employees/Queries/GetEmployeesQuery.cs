using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetEmployeesQuery() : IRequest<ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>>;
