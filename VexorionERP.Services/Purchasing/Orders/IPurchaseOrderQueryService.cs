using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IPurchaseOrderQueryService
{
    Task<ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseOrderDetailsResponse>> GetByIdAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default);
}
