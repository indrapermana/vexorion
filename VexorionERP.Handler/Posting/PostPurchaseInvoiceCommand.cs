using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record PostPurchaseInvoiceCommand(Guid PurchaseInvoiceId, PostPurchaseInvoiceRequest Request) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
