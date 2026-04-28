using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesInvoiceCommandService
{
    Task<ServiceResult<SalesInvoiceDetailsResponse>> CreateAsync(CreateSalesInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesInvoiceDetailsResponse>> UpdateAsync(Guid salesInvoiceId, UpdateSalesInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
}
