using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInventoryAdjustmentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryAdjustmentDetailsResponse>> GetByIdAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default);
}
