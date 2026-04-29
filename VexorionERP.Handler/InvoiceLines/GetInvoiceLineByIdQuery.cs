using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInvoiceLineByIdQuery(Guid InvoiceId, Guid InvoiceLineId) : IRequest<ServiceResult<InvoiceLineDetailsResponse>>;
