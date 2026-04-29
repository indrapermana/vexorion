using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateStockTransferCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateStockTransferCommand, StockTransfer, UpdateStockTransferRequest, StockTransferDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateStockTransferCommand request) => request.StockTransferId;

    protected override UpdateStockTransferRequest GetUpdateRequest(UpdateStockTransferCommand request) => request.Request;
}
