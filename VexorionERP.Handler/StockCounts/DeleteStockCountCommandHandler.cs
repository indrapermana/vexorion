using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteStockCountCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteStockCountCommand, StockCount>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteStockCountCommand request) => request.StockCountId;
}
