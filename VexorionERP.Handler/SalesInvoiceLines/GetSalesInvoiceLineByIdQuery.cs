using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesInvoiceLineByIdQuery(Guid SalesInvoiceId, Guid SalesInvoiceLineId) : IRequest<ServiceResult<SalesInvoiceLineDetailsResponse>>;
