using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteSalesOrderCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteSalesOrderCommand, SalesOrder>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteSalesOrderCommand request) => request.SalesOrderId;
}
