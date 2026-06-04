using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectAssignableEmployeesQuery(Guid ProjectId)
    : IRequest<ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>>;