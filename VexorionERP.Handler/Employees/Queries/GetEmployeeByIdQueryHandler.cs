using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetEmployeeByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetEmployeeByIdQuery, Employee, EmployeeDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetEmployeeByIdQuery request) => request.EmployeeId;
}
