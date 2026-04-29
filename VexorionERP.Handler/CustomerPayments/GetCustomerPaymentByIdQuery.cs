using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetCustomerPaymentByIdQuery(Guid CustomerPaymentId) : IRequest<ServiceResult<CustomerPaymentDetailsResponse>>;
