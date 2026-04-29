using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateInvoiceCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateInvoiceCommand, Invoice, CreateInvoiceRequest, InvoiceDetailsResponse>(serviceProvider)
{
    protected override CreateInvoiceRequest GetCreateRequest(CreateInvoiceCommand request) => request.Request;
}
