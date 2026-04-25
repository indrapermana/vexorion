using VexorionERP.Contracts.Purchasing.Receipts;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseReceiptCommandService
{
    Task<ServiceResult<PurchaseReceiptDetailsResponse>> CreateAsync(CreatePurchaseReceiptRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseReceiptDetailsResponse>> PostAsync(Guid receiptId, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid receiptId, CancellationToken cancellationToken = default);
}
