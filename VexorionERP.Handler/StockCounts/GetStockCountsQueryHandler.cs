using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetStockCountsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetStockCountsQuery, StockCount, StockCountListItemResponse>(serviceProvider);
