using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateSalesOrderCommand(CreateSalesOrderRequest Request) : IRequest<ServiceResult<SalesOrderDetailsResponse>>;
