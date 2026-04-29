using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCustomerPaymentByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetCustomerPaymentByIdQuery, CustomerPayment, CustomerPaymentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetCustomerPaymentByIdQuery request) => request.CustomerPaymentId;
}
