using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateWarehouseCommand(CreateWarehouseRequest Request) : IRequest<ServiceResult<WarehouseDetailsResponse>>;
