using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetPurchaseInvoiceLineByIdQuery(Guid PurchaseInvoiceId, Guid PurchaseInvoiceLineId) : IRequest<ServiceResult<PurchaseInvoiceLineDetailsResponse>>;
