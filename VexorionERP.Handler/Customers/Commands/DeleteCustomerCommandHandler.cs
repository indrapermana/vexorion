using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteCustomerCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteCustomerCommand, Customer>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteCustomerCommand request) => request.CustomerId;
}
