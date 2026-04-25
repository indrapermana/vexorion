using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IStockCountQueryService
{
    Task<ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<StockCountDetailsResponse>> GetByIdAsync(Guid stockCountId, CancellationToken cancellationToken = default);
}
