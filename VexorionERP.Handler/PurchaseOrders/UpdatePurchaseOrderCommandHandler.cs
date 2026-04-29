using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdatePurchaseOrderCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdatePurchaseOrderCommand, PurchaseOrder, UpdatePurchaseOrderRequest, PurchaseOrderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdatePurchaseOrderCommand request) => request.PurchaseOrderId;
    protected override UpdatePurchaseOrderRequest GetUpdateRequest(UpdatePurchaseOrderCommand request) => request.Request;
}
