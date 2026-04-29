using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseReceiptsForOrderQuery(Guid PurchaseOrderId) : IRequest<ServiceResult<IReadOnlyCollection<PurchaseReceiptListItemResponse>>>;
