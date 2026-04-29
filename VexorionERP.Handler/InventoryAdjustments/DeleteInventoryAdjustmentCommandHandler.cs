using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteInventoryAdjustmentCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteInventoryAdjustmentCommand, InventoryAdjustment>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteInventoryAdjustmentCommand request) => request.InventoryAdjustmentId;
}
