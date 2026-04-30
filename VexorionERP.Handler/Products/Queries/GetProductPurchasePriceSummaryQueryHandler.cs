using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProductPurchasePriceSummaryQueryHandler(
    IProductPurchasePriceHistoryQueryService queryService)
    : IRequestHandler<GetProductPurchasePriceSummaryQuery, ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>> Handle(
        GetProductPurchasePriceSummaryQuery request,
        CancellationToken cancellationToken)
    {
        return await queryService.GetSupplierSummaryAsync(
            request.ProductId,
            request.FromDate,
            request.ToDate,
            cancellationToken);
    }
}
