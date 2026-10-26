using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInventoryMovementAuditQuery(DateOnly? StartDate, DateOnly? EndDate, Guid? WarehouseId, Guid? ProductId, int Skip, int Take)
    : IRequest<ServiceResult<InventoryMovementAuditResponse>>;