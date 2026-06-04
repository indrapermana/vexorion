using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateDocumentFolderCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateDocumentFolderCommand, DocumentFolder, CreateDocumentFolderRequest, DocumentFolderDetailsResponse>(serviceProvider)
{
    protected override CreateDocumentFolderRequest GetCreateRequest(CreateDocumentFolderCommand request) => request.Request;
}
