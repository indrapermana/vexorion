using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetVendorPaymentByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetVendorPaymentByIdQuery, VendorPayment, VendorPaymentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetVendorPaymentByIdQuery request) => request.VendorPaymentId;
}
