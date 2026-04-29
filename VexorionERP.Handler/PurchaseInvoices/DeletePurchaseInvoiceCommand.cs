using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeletePurchaseInvoiceCommand(Guid PurchaseInvoiceId) : IRequest<ServiceResult<bool>>;
