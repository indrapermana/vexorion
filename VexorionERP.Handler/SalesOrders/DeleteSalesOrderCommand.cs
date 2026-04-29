using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSalesOrderCommand(Guid SalesOrderId) : IRequest<ServiceResult<bool>>;
