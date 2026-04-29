using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteStockCountCommand(Guid StockCountId) : IRequest<ServiceResult<bool>>;
