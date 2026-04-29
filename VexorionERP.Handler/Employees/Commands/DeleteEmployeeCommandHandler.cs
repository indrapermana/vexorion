using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteEmployeeCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteEmployeeCommand, Employee>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteEmployeeCommand request) => request.EmployeeId;
}
