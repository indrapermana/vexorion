using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateInvoiceCommand(Guid InvoiceId, UpdateInvoiceRequest Request) : IRequest<ServiceResult<InvoiceDetailsResponse>>;
