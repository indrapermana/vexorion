using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetStockTransfersQuery() : IRequest<ServiceResult<IReadOnlyCollection<StockTransferListItemResponse>>>;
