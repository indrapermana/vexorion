using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateDepartmentCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateDepartmentCommand, Department, CreateDepartmentRequest, DepartmentDetailsResponse>(serviceProvider)
{
    protected override CreateDepartmentRequest GetCreateRequest(CreateDepartmentCommand request) => request.Request;
}
