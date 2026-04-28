using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IStockTransferQueryService
{
    Task<ServiceResult<IReadOnlyCollection<StockTransferListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<StockTransferDetailsResponse>> GetByIdAsync(Guid stockTransferId, CancellationToken cancellationToken = default);
}
