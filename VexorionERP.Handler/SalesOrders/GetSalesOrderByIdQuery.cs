using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesOrderByIdQuery(Guid SalesOrderId) : IRequest<ServiceResult<SalesOrderDetailsResponse>>;
