using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreatePurchaseInvoiceCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreatePurchaseInvoiceCommand, PurchaseInvoice, CreatePurchaseInvoiceRequest, PurchaseInvoiceDetailsResponse>(serviceProvider)
{
    protected override CreatePurchaseInvoiceRequest GetCreateRequest(CreatePurchaseInvoiceCommand request) => request.Request;
}
