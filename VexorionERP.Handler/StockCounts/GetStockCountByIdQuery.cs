using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetStockCountByIdQuery(Guid StockCountId) : IRequest<ServiceResult<StockCountDetailsResponse>>;
