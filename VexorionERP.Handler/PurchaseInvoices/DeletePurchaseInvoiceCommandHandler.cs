using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeletePurchaseInvoiceCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeletePurchaseInvoiceCommand, PurchaseInvoice>(serviceProvider)
{
    protected override Guid GetEntityId(DeletePurchaseInvoiceCommand request) => request.PurchaseInvoiceId;
}
