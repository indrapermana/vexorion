using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetCustomerPaymentsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetCustomerPaymentsQuery, CustomerPayment, CustomerPaymentListItemResponse>(serviceProvider);
