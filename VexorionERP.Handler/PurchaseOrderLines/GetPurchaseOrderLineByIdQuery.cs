using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseOrderLineByIdQuery(Guid PurchaseOrderId, Guid PurchaseOrderLineId) : IRequest<ServiceResult<PurchaseOrderLineDetailsResponse>>;
