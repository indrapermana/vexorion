using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IPurchaseInvoiceCommandService
{
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> CreateAsync(CreatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> UpdateAsync(Guid purchaseInvoiceId, UpdatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default);
}
