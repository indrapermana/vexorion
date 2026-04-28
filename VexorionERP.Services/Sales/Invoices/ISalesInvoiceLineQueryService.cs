using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesInvoiceLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>> GetAllAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceLineDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, CancellationToken cancellationToken = default);
}
