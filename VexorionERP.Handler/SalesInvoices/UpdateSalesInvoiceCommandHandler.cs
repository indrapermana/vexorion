using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateSalesInvoiceCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateSalesInvoiceCommand, SalesInvoice, UpdateSalesInvoiceRequest, SalesInvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateSalesInvoiceCommand request) => request.SalesInvoiceId;

    protected override UpdateSalesInvoiceRequest GetUpdateRequest(UpdateSalesInvoiceCommand request) => request.Request;
}
