using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateInvoiceLineCommand(Guid InvoiceId, CreateInvoiceLineRequest Request) : IRequest<ServiceResult<InvoiceLineDetailsResponse>>;
