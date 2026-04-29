using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateCustomerCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateCustomerCommand, Customer, UpdateCustomerRequest, CustomerDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateCustomerCommand request) => request.CustomerId;

    protected override UpdateCustomerRequest GetUpdateRequest(UpdateCustomerCommand request) => request.Request;
}
