using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesInvoiceByIdQuery(Guid SalesInvoiceId) : IRequest<ServiceResult<SalesInvoiceDetailsResponse>>;
