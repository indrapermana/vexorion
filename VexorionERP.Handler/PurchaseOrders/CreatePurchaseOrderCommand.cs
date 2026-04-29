using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreatePurchaseOrderCommand(CreatePurchaseOrderRequest Request) : IRequest<ServiceResult<PurchaseOrderDetailsResponse>>;
