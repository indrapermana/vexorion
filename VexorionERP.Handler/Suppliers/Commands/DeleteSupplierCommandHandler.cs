using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteSupplierCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteSupplierCommand, Supplier>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteSupplierCommand request) => request.SupplierId;
}
