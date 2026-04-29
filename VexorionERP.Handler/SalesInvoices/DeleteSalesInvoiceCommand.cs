using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteSalesInvoiceCommand(Guid SalesInvoiceId) : IRequest<ServiceResult<bool>>;
