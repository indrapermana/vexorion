using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSalesOrderLineCommand(Guid SalesOrderId, Guid SalesOrderLineId) : IRequest<ServiceResult<bool>>;
