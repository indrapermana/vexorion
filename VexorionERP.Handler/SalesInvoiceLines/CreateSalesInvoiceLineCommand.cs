using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateSalesInvoiceLineCommand(Guid SalesInvoiceId, CreateSalesInvoiceLineRequest Request) : IRequest<ServiceResult<SalesInvoiceLineDetailsResponse>>;
