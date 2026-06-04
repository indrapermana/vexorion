using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateDocumentFolderCommand(Guid FolderId, UpdateDocumentFolderRequest Request)
    : IRequest<ServiceResult<DocumentFolderDetailsResponse>>;
