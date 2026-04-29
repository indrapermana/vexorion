using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteInventoryBalanceCommand(Guid InventoryBalanceId) : IRequest<ServiceResult<bool>>;
