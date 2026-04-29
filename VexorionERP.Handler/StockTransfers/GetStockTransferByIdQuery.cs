using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetStockTransferByIdQuery(Guid StockTransferId) : IRequest<ServiceResult<StockTransferDetailsResponse>>;
