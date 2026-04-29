using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteStockTransferLineCommand(Guid StockTransferId, Guid StockTransferLineId) : IRequest<ServiceResult<bool>>;
