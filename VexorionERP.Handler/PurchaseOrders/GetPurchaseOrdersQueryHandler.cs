using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetPurchaseOrdersQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetPurchaseOrdersQuery, PurchaseOrder, PurchaseOrderListItemResponse>(serviceProvider);
