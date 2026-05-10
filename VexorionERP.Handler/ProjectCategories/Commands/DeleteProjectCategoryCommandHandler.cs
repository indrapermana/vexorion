using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProjectCategoryCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProjectCategoryCommand, ProjectCategory>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProjectCategoryCommand request) => request.CategoryId;
}
