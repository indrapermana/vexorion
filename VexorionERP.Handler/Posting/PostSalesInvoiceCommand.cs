using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record PostSalesInvoiceCommand(Guid SalesInvoiceId, PostSalesInvoiceRequest Request) : IRequest<ServiceResult<JournalEntryDetailsResponse>>;
