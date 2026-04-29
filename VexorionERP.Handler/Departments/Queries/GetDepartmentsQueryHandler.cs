using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetDepartmentsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetDepartmentsQuery, Department, DepartmentListItemResponse>(serviceProvider);
