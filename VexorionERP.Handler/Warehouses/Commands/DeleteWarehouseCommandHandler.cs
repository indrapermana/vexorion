using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteWarehouseCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteWarehouseCommand, Warehouse>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteWarehouseCommand request) => request.WarehouseId;
}
