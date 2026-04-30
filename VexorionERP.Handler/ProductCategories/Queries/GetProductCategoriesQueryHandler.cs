using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProductCategoriesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetProductCategoriesQuery, ProductCategory, ProductCategoryListItemResponse>(serviceProvider);
