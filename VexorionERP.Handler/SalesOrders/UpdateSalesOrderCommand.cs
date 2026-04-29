using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateSalesOrderCommand(Guid SalesOrderId, UpdateSalesOrderRequest Request) : IRequest<ServiceResult<SalesOrderDetailsResponse>>;
