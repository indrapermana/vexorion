using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProductByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProductByIdQuery, Product, ProductDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProductByIdQuery request) => request.ProductId;
}