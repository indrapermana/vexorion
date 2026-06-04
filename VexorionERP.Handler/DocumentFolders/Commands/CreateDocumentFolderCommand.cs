using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateDocumentFolderCommand(CreateDocumentFolderRequest Request)
    : IRequest<ServiceResult<DocumentFolderDetailsResponse>>;
