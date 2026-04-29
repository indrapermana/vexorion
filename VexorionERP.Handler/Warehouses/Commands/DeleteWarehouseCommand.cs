using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteWarehouseCommand(Guid WarehouseId) : IRequest<ServiceResult<bool>>;
