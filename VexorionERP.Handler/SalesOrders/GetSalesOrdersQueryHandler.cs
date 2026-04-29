using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSalesOrdersQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetSalesOrdersQuery, SalesOrder, SalesOrderListItemResponse>(serviceProvider);
