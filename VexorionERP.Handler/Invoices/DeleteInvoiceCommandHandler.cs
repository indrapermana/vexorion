using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteInvoiceCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteInvoiceCommand, Invoice>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteInvoiceCommand request) => request.InvoiceId;
}
