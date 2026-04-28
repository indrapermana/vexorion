using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInvoiceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceDetailsResponse>> GetByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default);
}
