using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSalesInvoiceLineCommand(Guid SalesInvoiceId, Guid SalesInvoiceLineId) : IRequest<ServiceResult<bool>>;
