using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetPurchaseOrderByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetPurchaseOrderByIdQuery, PurchaseOrder, PurchaseOrderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetPurchaseOrderByIdQuery request) => request.PurchaseOrderId;
}
