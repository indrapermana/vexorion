using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateEmployeeCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateEmployeeCommand, Employee, UpdateEmployeeRequest, EmployeeDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateEmployeeCommand request) => request.EmployeeId;

    protected override UpdateEmployeeRequest GetUpdateRequest(UpdateEmployeeCommand request) => request.Request;
}
