using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateInvoiceLineCommand(Guid InvoiceId, Guid InvoiceLineId, UpdateInvoiceLineRequest Request) : IRequest<ServiceResult<InvoiceLineDetailsResponse>>;
