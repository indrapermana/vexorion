using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateEmployeeCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateEmployeeCommand, Employee, CreateEmployeeRequest, EmployeeDetailsResponse>(serviceProvider)
{
    protected override CreateEmployeeRequest GetCreateRequest(CreateEmployeeCommand request) => request.Request;
}
