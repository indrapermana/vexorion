using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateInvoiceCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateInvoiceCommand, Invoice, UpdateInvoiceRequest, InvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateInvoiceCommand request) => request.InvoiceId;

    protected override UpdateInvoiceRequest GetUpdateRequest(UpdateInvoiceCommand request) => request.Request;
}
