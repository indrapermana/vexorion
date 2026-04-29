using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInvoiceByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetInvoiceByIdQuery, Invoice, InvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetInvoiceByIdQuery request) => request.InvoiceId;
}
