using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSalesInvoicesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetSalesInvoicesQuery, SalesInvoice, SalesInvoiceListItemResponse>(serviceProvider);
