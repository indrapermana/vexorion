using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetStockCountByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetStockCountByIdQuery, StockCount, StockCountDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetStockCountByIdQuery request) => request.StockCountId;
}
