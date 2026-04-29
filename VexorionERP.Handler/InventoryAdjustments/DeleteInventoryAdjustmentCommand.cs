using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteInventoryAdjustmentCommand(Guid InventoryAdjustmentId) : IRequest<ServiceResult<bool>>;
