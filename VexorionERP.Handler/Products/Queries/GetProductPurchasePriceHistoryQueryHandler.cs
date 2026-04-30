using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProductPurchasePriceHistoryQueryHandler(
    IProductPurchasePriceHistoryQueryService queryService)
    : IRequestHandler<GetProductPurchasePriceHistoryQuery, ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>> Handle(
        GetProductPurchasePriceHistoryQuery request,
        CancellationToken cancellationToken)
    {
        return await queryService.GetLatestBySupplierAsync(request.ProductId, cancellationToken);
    }
}
