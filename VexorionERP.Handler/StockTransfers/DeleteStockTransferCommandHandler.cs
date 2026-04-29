using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteStockTransferCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteStockTransferCommand, StockTransfer>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteStockTransferCommand request) => request.StockTransferId;
}
