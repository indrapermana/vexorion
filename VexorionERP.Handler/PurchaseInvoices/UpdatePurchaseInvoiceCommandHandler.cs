using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdatePurchaseInvoiceCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdatePurchaseInvoiceCommand, PurchaseInvoice, UpdatePurchaseInvoiceRequest, PurchaseInvoiceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdatePurchaseInvoiceCommand request) => request.PurchaseInvoiceId;

    protected override UpdatePurchaseInvoiceRequest GetUpdateRequest(UpdatePurchaseInvoiceCommand request) => request.Request;
}
