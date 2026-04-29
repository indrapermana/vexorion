using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeletePurchaseOrderCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeletePurchaseOrderCommand, PurchaseOrder>(serviceProvider)
{
    protected override Guid GetEntityId(DeletePurchaseOrderCommand request) => request.PurchaseOrderId;
}
