using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateWarehouseCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateWarehouseCommand, Warehouse, UpdateWarehouseRequest, WarehouseDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateWarehouseCommand request) => request.WarehouseId;

    protected override UpdateWarehouseRequest GetUpdateRequest(UpdateWarehouseCommand request) => request.Request;
}
