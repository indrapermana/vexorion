using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateSupplierCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateSupplierCommand, Supplier, CreateSupplierRequest, SupplierDetailsResponse>(serviceProvider)
{
    protected override CreateSupplierRequest GetCreateRequest(CreateSupplierCommand request) => request.Request;
}
