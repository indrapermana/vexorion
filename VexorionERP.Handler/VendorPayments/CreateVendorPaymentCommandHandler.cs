using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateVendorPaymentCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateVendorPaymentCommand, VendorPayment, CreateVendorPaymentRequest, VendorPaymentDetailsResponse>(serviceProvider)
{
    protected override CreateVendorPaymentRequest GetCreateRequest(CreateVendorPaymentCommand request) => request.Request;
}
