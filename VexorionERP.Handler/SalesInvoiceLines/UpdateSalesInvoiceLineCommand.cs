using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateSalesInvoiceLineCommand(Guid SalesInvoiceId, Guid SalesInvoiceLineId, UpdateSalesInvoiceLineRequest Request) : IRequest<ServiceResult<SalesInvoiceLineDetailsResponse>>;
