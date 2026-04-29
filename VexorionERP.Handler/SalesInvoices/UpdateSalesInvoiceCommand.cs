using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateSalesInvoiceCommand(Guid SalesInvoiceId, UpdateSalesInvoiceRequest Request) : IRequest<ServiceResult<SalesInvoiceDetailsResponse>>;
