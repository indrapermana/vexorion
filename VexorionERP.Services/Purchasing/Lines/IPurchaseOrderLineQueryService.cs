using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IPurchaseOrderLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>> GetAllAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseOrderLineDetailsResponse>> GetByIdAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, CancellationToken cancellationToken = default);
}
