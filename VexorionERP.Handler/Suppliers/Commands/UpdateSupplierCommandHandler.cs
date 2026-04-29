using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateSupplierCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateSupplierCommand, Supplier, UpdateSupplierRequest, SupplierDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateSupplierCommand request) => request.SupplierId;

    protected override UpdateSupplierRequest GetUpdateRequest(UpdateSupplierCommand request) => request.Request;
}
