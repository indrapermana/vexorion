using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetDocumentFolderByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetDocumentFolderByIdQuery, DocumentFolder, DocumentFolderDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetDocumentFolderByIdQuery request) => request.FolderId;
}
