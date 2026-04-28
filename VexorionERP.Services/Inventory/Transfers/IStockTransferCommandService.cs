using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IStockTransferCommandService
{
    Task<ServiceResult<StockTransferDetailsResponse>> CreateAsync(CreateStockTransferRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<StockTransferDetailsResponse>> UpdateAsync(Guid stockTransferId, UpdateStockTransferRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid stockTransferId, CancellationToken cancellationToken = default);
}
