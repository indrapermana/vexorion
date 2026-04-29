using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateInventoryAdjustmentCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateInventoryAdjustmentCommand, InventoryAdjustment, UpdateInventoryAdjustmentRequest, InventoryAdjustmentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateInventoryAdjustmentCommand request) => request.InventoryAdjustmentId;

    protected override UpdateInventoryAdjustmentRequest GetUpdateRequest(UpdateInventoryAdjustmentCommand request) => request.Request;
}
