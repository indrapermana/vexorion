using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetSuppliersQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetSuppliersQuery, Supplier, SupplierListItemResponse>(serviceProvider);
