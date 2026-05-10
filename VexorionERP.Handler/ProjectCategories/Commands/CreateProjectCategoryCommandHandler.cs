using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateProjectCategoryCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateProjectCategoryCommand, ProjectCategory, CreateProjectCategoryRequest, ProjectCategoryDetailsResponse>(serviceProvider)
{
    protected override CreateProjectCategoryRequest GetCreateRequest(CreateProjectCategoryCommand request) => request.Request;
}
