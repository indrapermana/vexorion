using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetStockTransferByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetStockTransferByIdQuery, StockTransfer, StockTransferDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetStockTransferByIdQuery request) => request.StockTransferId;
}
