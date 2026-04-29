using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateInventoryAdjustmentCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateInventoryAdjustmentCommand, InventoryAdjustment, CreateInventoryAdjustmentRequest, InventoryAdjustmentDetailsResponse>(serviceProvider)
{
    protected override CreateInventoryAdjustmentRequest GetCreateRequest(CreateInventoryAdjustmentCommand request) => request.Request;
}
