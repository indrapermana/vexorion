using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesOrderLineByIdQuery(Guid SalesOrderId, Guid SalesOrderLineId) : IRequest<ServiceResult<SalesOrderLineDetailsResponse>>;
