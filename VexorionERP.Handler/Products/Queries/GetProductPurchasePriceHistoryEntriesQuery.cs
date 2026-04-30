using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProductPurchasePriceHistoryEntriesQuery(
    Guid ProductId,
    Guid? SupplierId,
    DateOnly? FromDate,
    DateOnly? ToDate)
    : IRequest<ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>>;
