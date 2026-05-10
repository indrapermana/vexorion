using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProjectCategoriesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetProjectCategoriesQuery, ProjectCategory, ProjectCategoryListItemResponse>(serviceProvider);
