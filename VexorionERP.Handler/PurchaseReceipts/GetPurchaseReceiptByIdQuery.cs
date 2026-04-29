using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseReceiptByIdQuery(Guid ReceiptId) : IRequest<ServiceResult<PurchaseReceiptDetailsResponse>>;
