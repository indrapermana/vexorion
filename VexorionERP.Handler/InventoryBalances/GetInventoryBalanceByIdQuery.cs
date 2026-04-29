using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInventoryBalanceByIdQuery(Guid InventoryBalanceId) : IRequest<ServiceResult<InventoryBalanceDetailsResponse>>;
