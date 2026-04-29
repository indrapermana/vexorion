using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseOrderByIdQuery(Guid PurchaseOrderId) : IRequest<ServiceResult<PurchaseOrderDetailsResponse>>;
