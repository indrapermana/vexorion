using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetWarehouseByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetWarehouseByIdQuery, Warehouse, WarehouseDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetWarehouseByIdQuery request) => request.WarehouseId;
}
