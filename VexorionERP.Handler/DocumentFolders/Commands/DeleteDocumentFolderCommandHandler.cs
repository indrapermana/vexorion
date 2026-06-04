using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteDocumentFolderCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteDocumentFolderCommand, DocumentFolder>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteDocumentFolderCommand request) => request.FolderId;
}
