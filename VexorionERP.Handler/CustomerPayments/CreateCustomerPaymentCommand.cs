using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateCustomerPaymentCommand(CreateCustomerPaymentRequest Request) : IRequest<ServiceResult<CustomerPaymentDetailsResponse>>;
