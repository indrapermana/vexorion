using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetProjectByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetProjectByIdQuery, Project, ProjectDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetProjectByIdQuery request) => request.ProjectId;
}
