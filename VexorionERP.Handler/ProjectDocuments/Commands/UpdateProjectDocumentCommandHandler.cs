using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateProjectDocumentCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateProjectDocumentCommand, ProjectDocument, UpdateProjectDocumentRequest, ProjectDocumentDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateProjectDocumentCommand request) => request.DocumentId;
    protected override UpdateProjectDocumentRequest GetUpdateRequest(UpdateProjectDocumentCommand request) => request.Request;
}
