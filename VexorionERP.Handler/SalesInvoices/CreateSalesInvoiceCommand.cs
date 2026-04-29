using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateSalesInvoiceCommand(CreateSalesInvoiceRequest Request) : IRequest<ServiceResult<SalesInvoiceDetailsResponse>>;
