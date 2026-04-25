using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryAdjustmentLineCommandService
{
    Task<ServiceResult<InventoryAdjustmentLineDetailsResponse>> CreateAsync(Guid inventoryAdjustmentId, CreateInventoryAdjustmentLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryAdjustmentLineDetailsResponse>> UpdateAsync(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, UpdateInventoryAdjustmentLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, CancellationToken cancellationToken = default);
}