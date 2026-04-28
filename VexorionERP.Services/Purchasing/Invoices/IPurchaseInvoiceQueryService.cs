using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IPurchaseInvoiceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAllAsync(bool outstandingOnly = false, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default);
}
