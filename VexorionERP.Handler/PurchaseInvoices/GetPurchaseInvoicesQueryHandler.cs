using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetPurchaseInvoicesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetPurchaseInvoicesQuery, PurchaseInvoice, PurchaseInvoiceListItemResponse>(serviceProvider);
