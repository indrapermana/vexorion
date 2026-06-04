using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteDocumentFolderCommand(Guid FolderId)
    : IRequest<ServiceResult<bool>>;
