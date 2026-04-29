using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetDepartmentByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetDepartmentByIdQuery, Department, DepartmentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetDepartmentByIdQuery request) => request.DepartmentId;
}
