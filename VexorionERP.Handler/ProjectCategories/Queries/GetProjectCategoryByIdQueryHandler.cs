using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProjectCategoryByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProjectCategoryByIdQuery, ProjectCategory, ProjectCategoryDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProjectCategoryByIdQuery request) => request.CategoryId;
}
