using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateSalesOrderLineCommand(Guid SalesOrderId, Guid SalesOrderLineId, UpdateSalesOrderLineRequest Request) : IRequest<ServiceResult<SalesOrderLineDetailsResponse>>;
