using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateDepartmentCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateDepartmentCommand, Department, UpdateDepartmentRequest, DepartmentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateDepartmentCommand request) => request.DepartmentId;

    protected override UpdateDepartmentRequest GetUpdateRequest(UpdateDepartmentCommand request) => request.Request;
}
