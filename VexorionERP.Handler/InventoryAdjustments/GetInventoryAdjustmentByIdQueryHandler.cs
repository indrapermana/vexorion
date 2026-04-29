using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInventoryAdjustmentByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetInventoryAdjustmentByIdQuery, InventoryAdjustment, InventoryAdjustmentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetInventoryAdjustmentByIdQuery request) => request.InventoryAdjustmentId;
}
