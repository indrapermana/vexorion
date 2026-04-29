using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteInvoiceCommand(Guid InvoiceId) : IRequest<ServiceResult<bool>>;
