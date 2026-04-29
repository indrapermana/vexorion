using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateStockCountCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateStockCountCommand, StockCount, UpdateStockCountRequest, StockCountDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateStockCountCommand request) => request.StockCountId;
    protected override UpdateStockCountRequest GetUpdateRequest(UpdateStockCountCommand request) => request.Request;
}
