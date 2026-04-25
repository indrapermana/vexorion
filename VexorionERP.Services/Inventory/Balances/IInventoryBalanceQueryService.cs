using VexorionERP.Contracts.Inventory.Balances;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryBalanceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryBalanceDetailsResponse>> GetByIdAsync(Guid inventoryBalanceId, CancellationToken cancellationToken = default);
}