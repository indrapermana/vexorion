using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProductsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetProductsQuery, Product, ProductListItemResponse>(serviceProvider);