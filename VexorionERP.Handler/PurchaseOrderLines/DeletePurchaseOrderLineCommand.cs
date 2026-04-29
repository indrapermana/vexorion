using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeletePurchaseOrderLineCommand(Guid PurchaseOrderId, Guid PurchaseOrderLineId) : IRequest<ServiceResult<bool>>;
