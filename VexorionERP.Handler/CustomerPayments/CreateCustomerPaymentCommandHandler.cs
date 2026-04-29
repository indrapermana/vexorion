using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateCustomerPaymentCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateCustomerPaymentCommand, CustomerPayment, CreateCustomerPaymentRequest, CustomerPaymentDetailsResponse>(serviceProvider)
{
    protected override CreateCustomerPaymentRequest GetCreateRequest(CreateCustomerPaymentCommand request) => request.Request;
}
