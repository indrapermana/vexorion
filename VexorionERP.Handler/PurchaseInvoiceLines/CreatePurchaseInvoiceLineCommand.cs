using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreatePurchaseInvoiceLineCommand(Guid PurchaseInvoiceId, CreatePurchaseInvoiceLineRequest Request) : IRequest<ServiceResult<PurchaseInvoiceLineDetailsResponse>>;
