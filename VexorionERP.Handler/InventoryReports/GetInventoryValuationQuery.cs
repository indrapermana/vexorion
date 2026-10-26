using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInventoryValuationQuery(Guid? WarehouseId) : IRequest<ServiceResult<InventoryValuationReportResponse>>;