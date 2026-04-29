using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetStockTransfersQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetStockTransfersQuery, StockTransfer, StockTransferListItemResponse>(serviceProvider);
