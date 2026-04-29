using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateStockCountCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateStockCountCommand, StockCount, CreateStockCountRequest, StockCountDetailsResponse>(serviceProvider)
{
    protected override CreateStockCountRequest GetCreateRequest(CreateStockCountCommand request) => request.Request;
}
