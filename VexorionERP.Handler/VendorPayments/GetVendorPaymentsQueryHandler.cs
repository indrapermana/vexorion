using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetVendorPaymentsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetVendorPaymentsQuery, VendorPayment, VendorPaymentListItemResponse>(serviceProvider);
