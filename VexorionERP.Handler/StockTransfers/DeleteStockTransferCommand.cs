using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteStockTransferCommand(Guid StockTransferId) : IRequest<ServiceResult<bool>>;
