using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdatePurchaseOrderCommand(Guid PurchaseOrderId, UpdatePurchaseOrderRequest Request) : IRequest<ServiceResult<PurchaseOrderDetailsResponse>>;
