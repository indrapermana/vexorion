using VexorionERP.Contracts.Billing.Invoices;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInvoiceCommandService
{
    Task<ServiceResult<InvoiceDetailsResponse>> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceDetailsResponse>> UpdateAsync(Guid invoiceId, UpdateInvoiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid invoiceId, CancellationToken cancellationToken = default);
}