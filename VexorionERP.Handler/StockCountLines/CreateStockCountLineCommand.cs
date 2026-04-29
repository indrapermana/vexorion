using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateStockCountLineCommand(Guid StockCountId, CreateStockCountLineRequest Request) : IRequest<ServiceResult<StockCountLineDetailsResponse>>;
