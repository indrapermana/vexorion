using VexorionERP.Contracts.Purchasing.Receipts;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseReceiptQueryService
{
    Task<ServiceResult<List<PurchaseReceiptListItemResponse>>> GetAllForOrderAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseReceiptDetailsResponse>> GetByIdAsync(Guid receiptId, CancellationToken cancellationToken = default);
}
