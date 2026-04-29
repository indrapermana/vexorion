using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSupplierByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetSupplierByIdQuery, Supplier, SupplierDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetSupplierByIdQuery request) => request.SupplierId;
}
