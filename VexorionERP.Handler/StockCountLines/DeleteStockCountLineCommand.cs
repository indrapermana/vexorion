using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteStockCountLineCommand(Guid StockCountId, Guid StockCountLineId) : IRequest<ServiceResult<bool>>;
