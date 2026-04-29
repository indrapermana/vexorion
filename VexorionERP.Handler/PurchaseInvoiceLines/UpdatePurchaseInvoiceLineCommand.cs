using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdatePurchaseInvoiceLineCommand(Guid PurchaseInvoiceId, Guid PurchaseInvoiceLineId, UpdatePurchaseInvoiceLineRequest Request) : IRequest<ServiceResult<PurchaseInvoiceLineDetailsResponse>>;
