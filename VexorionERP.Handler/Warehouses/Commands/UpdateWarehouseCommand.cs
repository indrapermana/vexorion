using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateWarehouseCommand(Guid WarehouseId, UpdateWarehouseRequest Request) : IRequest<ServiceResult<WarehouseDetailsResponse>>;
