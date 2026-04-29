using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreatePurchaseReceiptCommand(CreatePurchaseReceiptRequest Request) : IRequest<ServiceResult<PurchaseReceiptDetailsResponse>>;
