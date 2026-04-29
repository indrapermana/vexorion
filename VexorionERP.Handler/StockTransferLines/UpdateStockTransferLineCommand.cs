using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateStockTransferLineCommand(Guid StockTransferId, Guid StockTransferLineId, UpdateStockTransferLineRequest Request) : IRequest<ServiceResult<StockTransferLineDetailsResponse>>;
