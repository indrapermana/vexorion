using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSalesShipmentCommand(Guid ShipmentId) : IRequest<ServiceResult<bool>>;
