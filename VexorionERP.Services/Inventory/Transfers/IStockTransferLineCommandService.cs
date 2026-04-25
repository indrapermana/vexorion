using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IStockTransferLineCommandService
{
    Task<ServiceResult<StockTransferLineDetailsResponse>> CreateAsync(Guid stockTransferId, CreateStockTransferLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<StockTransferLineDetailsResponse>> UpdateAsync(Guid stockTransferId, Guid stockTransferLineId, UpdateStockTransferLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid stockTransferId, Guid stockTransferLineId, CancellationToken cancellationToken = default);
}