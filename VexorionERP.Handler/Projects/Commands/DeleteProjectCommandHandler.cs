using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProjectCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProjectCommand, Project>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProjectCommand request) => request.ProjectId;
}
