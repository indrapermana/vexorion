using VexorionERP.Contracts.Inventory.Balances;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryBalanceCommandService
{
    Task<ServiceResult<InventoryBalanceDetailsResponse>> CreateAsync(CreateInventoryBalanceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryBalanceDetailsResponse>> UpdateAsync(Guid inventoryBalanceId, UpdateInventoryBalanceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid inventoryBalanceId, CancellationToken cancellationToken = default);
}