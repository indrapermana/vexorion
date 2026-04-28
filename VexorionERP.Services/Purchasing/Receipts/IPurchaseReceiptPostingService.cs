using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IPurchaseReceiptPostingService
{
    Task<ServiceResult<PurchaseReceiptDetailsResponse>> PostAsync(Guid receiptId, CancellationToken cancellationToken = default);
}
