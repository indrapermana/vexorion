using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteInventoryAdjustmentLineCommand(Guid InventoryAdjustmentId, Guid InventoryAdjustmentLineId) : IRequest<ServiceResult<bool>>;
