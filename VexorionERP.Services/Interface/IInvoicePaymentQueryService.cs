using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface IInvoicePaymentQueryService<TPayment> where TPayment : class
{
    Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TPayment>>>> GetForInvoiceAsync(
        Guid invoiceId,
        AppDbContext context,
        CancellationToken cancellationToken = default);
}