using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetSalesInvoiceLinesQuery(Guid SalesInvoiceId) : IRequest<ServiceResult<IReadOnlyCollection<SalesInvoiceLineListItemResponse>>>;
