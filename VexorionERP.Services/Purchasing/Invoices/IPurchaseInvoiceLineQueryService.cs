using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseInvoiceLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>> GetAllAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, CancellationToken cancellationToken = default);
}
