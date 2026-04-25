using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseInvoiceLineCommandService
{
    Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> CreateAsync(Guid purchaseInvoiceId, CreatePurchaseInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> UpdateAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, UpdatePurchaseInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, CancellationToken cancellationToken = default);
}
