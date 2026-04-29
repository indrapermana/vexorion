using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateStockCountCommand(Guid StockCountId, UpdateStockCountRequest Request) : IRequest<ServiceResult<StockCountDetailsResponse>>;
