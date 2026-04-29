using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreatePurchaseOrderCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreatePurchaseOrderCommand, PurchaseOrder, CreatePurchaseOrderRequest, PurchaseOrderDetailsResponse>(serviceProvider)
{
    protected override CreatePurchaseOrderRequest GetCreateRequest(CreatePurchaseOrderCommand request) => request.Request;
}
