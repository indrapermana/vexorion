using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInventoryAdjustmentsQuery() : IRequest<ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>>;
