using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IStockCountCommandService
{
    Task<ServiceResult<StockCountDetailsResponse>> CreateAsync(CreateStockCountRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<StockCountDetailsResponse>> UpdateAsync(Guid stockCountId, UpdateStockCountRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, CancellationToken cancellationToken = default);
}
