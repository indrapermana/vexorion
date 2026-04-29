using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetEmployeesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetEmployeesQuery, Employee, EmployeeListItemResponse>(serviceProvider);
