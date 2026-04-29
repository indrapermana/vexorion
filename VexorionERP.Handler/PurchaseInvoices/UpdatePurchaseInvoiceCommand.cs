using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdatePurchaseInvoiceCommand(Guid PurchaseInvoiceId, UpdatePurchaseInvoiceRequest Request) : IRequest<ServiceResult<PurchaseInvoiceDetailsResponse>>;
