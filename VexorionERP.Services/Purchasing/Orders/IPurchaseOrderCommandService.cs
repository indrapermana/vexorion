using VexorionERP.Contracts.Purchasing.Orders;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseOrderCommandService
{
    Task<ServiceResult<PurchaseOrderDetailsResponse>> CreateAsync(CreatePurchaseOrderRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseOrderDetailsResponse>> UpdateAsync(Guid purchaseOrderId, UpdatePurchaseOrderRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default);
}