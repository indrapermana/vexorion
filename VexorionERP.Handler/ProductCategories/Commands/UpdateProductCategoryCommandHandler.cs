using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProductCategoryCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProductCategoryCommand, ProductCategory, UpdateProductCategoryRequest, ProductCategoryDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProductCategoryCommand request) => request.CategoryId;

    protected override UpdateProductCategoryRequest GetUpdateRequest(UpdateProductCategoryCommand request) => request.Request;
}
