using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteProjectDocumentCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteProjectDocumentCommand, ProjectDocument>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteProjectDocumentCommand request) => request.DocumentId;
}
