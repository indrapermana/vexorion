using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryAdjustmentCommandService
{
    Task<ServiceResult<InventoryAdjustmentDetailsResponse>> CreateAsync(CreateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryAdjustmentDetailsResponse>> UpdateAsync(Guid inventoryAdjustmentId, UpdateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default);
}