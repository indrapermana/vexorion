using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreatePurchaseOrderLineCommand(Guid PurchaseOrderId, CreatePurchaseOrderLineRequest Request) : IRequest<ServiceResult<PurchaseOrderLineDetailsResponse>>;
