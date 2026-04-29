using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetPurchaseInvoiceByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetPurchaseInvoiceByIdQuery, PurchaseInvoice, PurchaseInvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetPurchaseInvoiceByIdQuery request) => request.PurchaseInvoiceId;
}
