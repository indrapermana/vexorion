using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateSalesOrderLineCommand(Guid SalesOrderId, CreateSalesOrderLineRequest Request) : IRequest<ServiceResult<SalesOrderLineDetailsResponse>>;
