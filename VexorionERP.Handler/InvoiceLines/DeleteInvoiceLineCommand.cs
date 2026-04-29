using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteInvoiceLineCommand(Guid InvoiceId, Guid InvoiceLineId) : IRequest<ServiceResult<bool>>;
