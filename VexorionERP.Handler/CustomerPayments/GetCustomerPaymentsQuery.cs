using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetCustomerPaymentsQuery() : IRequest<ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>>;
