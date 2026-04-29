using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseInvoiceLinesQuery(Guid PurchaseInvoiceId) : IRequest<ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>>;
