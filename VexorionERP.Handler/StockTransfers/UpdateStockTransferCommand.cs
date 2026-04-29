using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateStockTransferCommand(Guid StockTransferId, UpdateStockTransferRequest Request) : IRequest<ServiceResult<StockTransferDetailsResponse>>;
