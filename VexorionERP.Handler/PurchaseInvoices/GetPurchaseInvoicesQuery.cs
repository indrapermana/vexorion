using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseInvoicesQuery() : IRequest<ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>>;
