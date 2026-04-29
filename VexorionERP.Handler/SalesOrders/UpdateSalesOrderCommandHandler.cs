using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateSalesOrderCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateSalesOrderCommand, SalesOrder, UpdateSalesOrderRequest, SalesOrderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateSalesOrderCommand request) => request.SalesOrderId;
    protected override UpdateSalesOrderRequest GetUpdateRequest(UpdateSalesOrderCommand request) => request.Request;
}
