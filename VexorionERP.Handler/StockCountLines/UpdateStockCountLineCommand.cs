using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateStockCountLineCommand(Guid StockCountId, Guid StockCountLineId, UpdateStockCountLineRequest Request) : IRequest<ServiceResult<StockCountLineDetailsResponse>>;
