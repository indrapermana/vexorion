using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteDepartmentCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteDepartmentCommand, Department>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteDepartmentCommand request) => request.DepartmentId;
}
