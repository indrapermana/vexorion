using VexorionERP.Contracts.Billing.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInvoiceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceDetailsResponse>> GetByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default);
}