using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesInvoiceQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAllAsync(bool outstandingOnly = false, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
}
