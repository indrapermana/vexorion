using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IInvoiceLineCommandService
{
    Task<ServiceResult<InvoiceLineDetailsResponse>> CreateAsync(Guid invoiceId, CreateInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<InvoiceLineDetailsResponse>> UpdateAsync(Guid invoiceId, Guid invoiceLineId, UpdateInvoiceLineRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid invoiceId, Guid invoiceLineId, CancellationToken cancellationToken = default);
}
