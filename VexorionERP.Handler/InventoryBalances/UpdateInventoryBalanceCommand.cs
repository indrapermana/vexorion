using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateInventoryBalanceCommand(Guid InventoryBalanceId, UpdateInventoryBalanceRequest Request) : IRequest<ServiceResult<InventoryBalanceDetailsResponse>>;
