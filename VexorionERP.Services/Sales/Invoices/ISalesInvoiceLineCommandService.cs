using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesInvoiceLineCommandService
{
    Task<ServiceResult<SalesInvoiceLineDetailsResponse>> CreateAsync(Guid salesInvoiceId, CreateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceLineDetailsResponse>> UpdateAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, UpdateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, CancellationToken cancellationToken = default);
}
