using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateInventoryAdjustmentCommand(Guid InventoryAdjustmentId, UpdateInventoryAdjustmentRequest Request) : IRequest<ServiceResult<InventoryAdjustmentDetailsResponse>>;
