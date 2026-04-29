using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetWarehouseByIdQuery(Guid WarehouseId) : IRequest<ServiceResult<WarehouseDetailsResponse>>;
