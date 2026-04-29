using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetWarehousesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetWarehousesQuery, Warehouse, WarehouseListItemResponse>(serviceProvider);
