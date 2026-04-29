using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateInventoryAdjustmentCommand(CreateInventoryAdjustmentRequest Request) : IRequest<ServiceResult<InventoryAdjustmentDetailsResponse>>;
