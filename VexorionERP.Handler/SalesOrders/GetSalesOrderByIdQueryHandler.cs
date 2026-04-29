using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSalesOrderByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetSalesOrderByIdQuery, SalesOrder, SalesOrderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetSalesOrderByIdQuery request) => request.SalesOrderId;
}
