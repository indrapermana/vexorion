using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteSalesInvoiceCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteSalesInvoiceCommand, SalesInvoice>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteSalesInvoiceCommand request) => request.SalesInvoiceId;
}
