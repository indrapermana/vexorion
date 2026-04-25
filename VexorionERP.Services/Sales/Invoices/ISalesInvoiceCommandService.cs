using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesInvoiceCommandService
{
    Task<ServiceResult<SalesInvoiceDetailsResponse>> CreateAsync(CreateSalesInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceDetailsResponse>> UpdateAsync(Guid salesInvoiceId, UpdateSalesInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
}
