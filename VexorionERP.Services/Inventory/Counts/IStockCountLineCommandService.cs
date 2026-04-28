using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IStockCountLineCommandService
{
    Task<ServiceResult<StockCountLineDetailsResponse>> CreateAsync(Guid stockCountId, CreateStockCountLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<StockCountLineDetailsResponse>> UpdateAsync(Guid stockCountId, Guid stockCountLineId, UpdateStockCountLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, Guid stockCountLineId, CancellationToken cancellationToken = default);
}
