using VexorionERP.Contracts.Billing.Lines;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInvoiceLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> GetAllAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceLineDetailsResponse>> GetByIdAsync(Guid invoiceId, Guid invoiceLineId, CancellationToken cancellationToken = default);
}