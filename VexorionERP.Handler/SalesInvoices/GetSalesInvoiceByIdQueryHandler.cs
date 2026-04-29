using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSalesInvoiceByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetSalesInvoiceByIdQuery, SalesInvoice, SalesInvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetSalesInvoiceByIdQuery request) => request.SalesInvoiceId;
}
