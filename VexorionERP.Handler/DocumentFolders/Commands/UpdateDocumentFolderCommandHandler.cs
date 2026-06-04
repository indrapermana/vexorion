using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateDocumentFolderCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateDocumentFolderCommand, DocumentFolder, UpdateDocumentFolderRequest, DocumentFolderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateDocumentFolderCommand request) => request.FolderId;
    protected override UpdateDocumentFolderRequest GetUpdateRequest(UpdateDocumentFolderCommand request) => request.Request;
}
