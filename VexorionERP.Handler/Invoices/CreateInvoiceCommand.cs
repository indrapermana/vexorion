using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateInvoiceCommand(CreateInvoiceRequest Request) : IRequest<ServiceResult<InvoiceDetailsResponse>>;
