using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInventoryBalanceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryBalanceDetailsResponse>> GetByIdAsync(Guid inventoryBalanceId, CancellationToken cancellationToken = default);
}
