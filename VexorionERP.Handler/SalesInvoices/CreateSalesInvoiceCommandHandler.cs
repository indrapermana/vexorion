using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateSalesInvoiceCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateSalesInvoiceCommand, SalesInvoice, CreateSalesInvoiceRequest, SalesInvoiceDetailsResponse>(serviceProvider)
{
    protected override CreateSalesInvoiceRequest GetCreateRequest(CreateSalesInvoiceCommand request) => request.Request;
}
