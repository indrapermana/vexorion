using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesShipmentsForOrderQuery(Guid SalesOrderId) : IRequest<ServiceResult<IReadOnlyCollection<SalesShipmentListItemResponse>>>;
