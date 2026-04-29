using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseOrderLinesQuery(Guid PurchaseOrderId) : IRequest<ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>>;
