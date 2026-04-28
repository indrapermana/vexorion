using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IStockCountQueryService
{
    Task<ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<StockCountDetailsResponse>> GetByIdAsync(Guid stockCountId, CancellationToken cancellationToken = default);
}
