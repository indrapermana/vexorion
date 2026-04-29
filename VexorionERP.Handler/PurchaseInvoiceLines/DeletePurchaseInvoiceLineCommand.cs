using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeletePurchaseInvoiceLineCommand(Guid PurchaseInvoiceId, Guid PurchaseInvoiceLineId) : IRequest<ServiceResult<bool>>;
