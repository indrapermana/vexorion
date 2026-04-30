using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProductPurchasePriceHistoryEntriesQueryHandler(
    IProductPurchasePriceHistoryQueryService queryService)
    : IRequestHandler<GetProductPurchasePriceHistoryEntriesQuery, ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>> Handle(
        GetProductPurchasePriceHistoryEntriesQuery request,
        CancellationToken cancellationToken)
    {
        return await queryService.GetHistoryAsync(
            request.ProductId,
            request.SupplierId,
            request.FromDate,
            request.ToDate,
            cancellationToken);
    }
}
