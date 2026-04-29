using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInventoryAdjustmentsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetInventoryAdjustmentsQuery, InventoryAdjustment, InventoryAdjustmentListItemResponse>(serviceProvider);
