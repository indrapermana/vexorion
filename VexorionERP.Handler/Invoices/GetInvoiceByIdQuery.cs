using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetInvoiceByIdQuery(Guid InvoiceId) : IRequest<ServiceResult<InvoiceDetailsResponse>>;
