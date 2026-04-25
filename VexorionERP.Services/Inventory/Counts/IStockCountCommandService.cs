using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IStockCountCommandService
{
    Task<ServiceResult<StockCountDetailsResponse>> CreateAsync(CreateStockCountRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<StockCountDetailsResponse>> UpdateAsync(Guid stockCountId, UpdateStockCountRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, CancellationToken cancellationToken = default);
}
