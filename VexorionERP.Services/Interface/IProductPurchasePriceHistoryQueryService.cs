using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IProductPurchasePriceHistoryQueryService
{
    Task<ServiceResult<IReadOnlyCollection<ProductSupplierLatestPurchasePriceResponse>>> GetLatestBySupplierAsync(
        Guid productId,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IReadOnlyCollection<ProductPurchasePriceHistoryEntryResponse>>> GetHistoryAsync(
        Guid productId,
        Guid? supplierId = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<IReadOnlyCollection<ProductSupplierPurchasePriceSummaryResponse>>> GetSupplierSummaryAsync(
        Guid productId,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default);
}
