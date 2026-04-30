using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProductCategoryCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProductCategoryCommand, ProductCategory>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProductCategoryCommand request) => request.CategoryId;
}
