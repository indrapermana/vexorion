using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeletePurchaseOrderCommand(Guid PurchaseOrderId) : IRequest<ServiceResult<bool>>;
