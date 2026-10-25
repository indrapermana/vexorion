using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetCustomerPaymentsQueryHandler(
    IServiceProvider serviceProvider,
    IInvoicePaymentQueryService<CustomerPayment> invoicePaymentQueryService)
    : BaseHandler<CustomerPayment>(serviceProvider), IRequestHandler<GetCustomerPaymentsQuery, ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> Handle(GetCustomerPaymentsQuery request, CancellationToken cancellationToken)
    {
        var result = request.SalesInvoiceId.HasValue
            ? await invoicePaymentQueryService.GetForInvoiceAsync(request.SalesInvoiceId.Value, DbContext, cancellationToken)
            : await QueryService.GetAllAsync(DbContext, cancellationToken);
        return MapList<CustomerPaymentListItemResponse>(result);
    }
}
