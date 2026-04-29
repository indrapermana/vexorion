using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdatePurchaseOrderLineCommand(Guid PurchaseOrderId, Guid PurchaseOrderLineId, UpdatePurchaseOrderLineRequest Request) : IRequest<ServiceResult<PurchaseOrderLineDetailsResponse>>;
