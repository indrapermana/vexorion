using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProjectCategoryCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProjectCategoryCommand, ProjectCategory, UpdateProjectCategoryRequest, ProjectCategoryDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProjectCategoryCommand request) => request.CategoryId;

    protected override UpdateProjectCategoryRequest GetUpdateRequest(UpdateProjectCategoryCommand request) => request.Request;
}
