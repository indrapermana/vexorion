using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IPurchaseInvoiceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<PurchaseInvoiceDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default);
}
