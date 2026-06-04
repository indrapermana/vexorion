using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectDocumentsQuery(
    Guid ProjectId,
    Guid? DocumentFolderId,
    ManagedDocumentStatus? Status,
    string? SearchTerm)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>>;
