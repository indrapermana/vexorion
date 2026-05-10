using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateProjectCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateProjectCommand, Project, CreateProjectRequest, ProjectDetailsResponse>(serviceProvider)
{
    protected override CreateProjectRequest GetCreateRequest(CreateProjectCommand request) => request.Request;
}
