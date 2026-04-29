using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateInventoryAdjustmentLineCommand(Guid InventoryAdjustmentId, CreateInventoryAdjustmentLineRequest Request) : IRequest<ServiceResult<InventoryAdjustmentLineDetailsResponse>>;
