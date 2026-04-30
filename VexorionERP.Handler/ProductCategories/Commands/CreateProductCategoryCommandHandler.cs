using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateProductCategoryCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateProductCategoryCommand, ProductCategory, CreateProductCategoryRequest, ProductCategoryDetailsResponse>(serviceProvider)
{
    protected override CreateProductCategoryRequest GetCreateRequest(CreateProductCategoryCommand request) => request.Request;
}
