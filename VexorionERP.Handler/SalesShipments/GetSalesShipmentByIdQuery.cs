using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesShipmentByIdQuery(Guid ShipmentId) : IRequest<ServiceResult<SalesShipmentDetailsResponse>>;
