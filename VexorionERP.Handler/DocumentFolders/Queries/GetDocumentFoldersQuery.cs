using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDocumentFoldersQuery(Guid ProjectId, Guid? ParentFolderId)
    : IRequest<ServiceResult<IReadOnlyCollection<DocumentFolderListItemResponse>>>;
