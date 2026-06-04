using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDocumentFolderByIdQuery(Guid FolderId)
    : IRequest<ServiceResult<DocumentFolderDetailsResponse>>;
