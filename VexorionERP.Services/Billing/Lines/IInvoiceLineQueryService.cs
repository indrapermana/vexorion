using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInvoiceLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InvoiceLineListItemResponse>>> GetAllAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceLineDetailsResponse>> GetByIdAsync(Guid invoiceId, Guid invoiceLineId, CancellationToken cancellationToken = default);
}
