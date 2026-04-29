using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateCustomerCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateCustomerCommand, Customer, CreateCustomerRequest, CustomerDetailsResponse>(serviceProvider)
{
    protected override CreateCustomerRequest GetCreateRequest(CreateCustomerCommand request) => request.Request;
}
