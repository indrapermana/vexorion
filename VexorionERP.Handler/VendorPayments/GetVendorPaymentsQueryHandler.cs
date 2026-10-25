using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetVendorPaymentsQueryHandler(
    IServiceProvider serviceProvider,
    IInvoicePaymentQueryService<VendorPayment> invoicePaymentQueryService)
    : BaseHandler<VendorPayment>(serviceProvider), IRequestHandler<GetVendorPaymentsQuery, ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<VendorPaymentListItemResponse>>> Handle(GetVendorPaymentsQuery request, CancellationToken cancellationToken)
    {
        var result = request.PurchaseInvoiceId.HasValue
            ? await invoicePaymentQueryService.GetForInvoiceAsync(request.PurchaseInvoiceId.Value, DbContext, cancellationToken)
            : await QueryService.GetAllAsync(DbContext, cancellationToken);
        return MapList<VendorPaymentListItemResponse>(result);
    }
}
