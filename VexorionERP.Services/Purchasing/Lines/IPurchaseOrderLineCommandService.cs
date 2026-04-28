using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IPurchaseOrderLineCommandService
{
    Task<ServiceResult<PurchaseOrderLineDetailsResponse>> CreateAsync(Guid purchaseOrderId, CreatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseOrderLineDetailsResponse>> UpdateAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, UpdatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, CancellationToken cancellationToken = default);
}
