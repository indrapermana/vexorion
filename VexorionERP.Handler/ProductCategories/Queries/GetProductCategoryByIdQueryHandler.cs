using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProductCategoryByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProductCategoryByIdQuery, ProductCategory, ProductCategoryDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProductCategoryByIdQuery request) => request.CategoryId;
}
