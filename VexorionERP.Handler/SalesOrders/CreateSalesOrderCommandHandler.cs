using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateSalesOrderCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateSalesOrderCommand, SalesOrder, CreateSalesOrderRequest, SalesOrderDetailsResponse>(serviceProvider)
{
    protected override CreateSalesOrderRequest GetCreateRequest(CreateSalesOrderCommand request) => request.Request;
}
