using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateInventoryAdjustmentLineCommand(Guid InventoryAdjustmentId, Guid InventoryAdjustmentLineId, UpdateInventoryAdjustmentLineRequest Request) : IRequest<ServiceResult<InventoryAdjustmentLineDetailsResponse>>;
