using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInvoicesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetInvoicesQuery, Invoice, InvoiceListItemResponse>(serviceProvider);
