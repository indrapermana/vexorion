using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateStockTransferCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateStockTransferCommand, StockTransfer, CreateStockTransferRequest, StockTransferDetailsResponse>(serviceProvider)
{
    protected override CreateStockTransferRequest GetCreateRequest(CreateStockTransferCommand request) => request.Request;
}
