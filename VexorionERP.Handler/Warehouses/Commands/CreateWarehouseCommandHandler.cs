using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateWarehouseCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateWarehouseCommand, Warehouse, CreateWarehouseRequest, WarehouseDetailsResponse>(serviceProvider)
{
    protected override CreateWarehouseRequest GetCreateRequest(CreateWarehouseCommand request) => request.Request;
}
