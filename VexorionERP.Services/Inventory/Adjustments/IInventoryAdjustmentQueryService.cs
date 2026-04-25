using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryAdjustmentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryAdjustmentDetailsResponse>> GetByIdAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default);
}