using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProjectCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProjectCommand, Project, UpdateProjectRequest, ProjectDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProjectCommand request) => request.ProjectId;

    protected override UpdateProjectRequest GetUpdateRequest(UpdateProjectCommand request) => request.Request;
}
