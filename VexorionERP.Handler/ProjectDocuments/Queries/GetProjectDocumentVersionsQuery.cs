using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectDocumentVersionsQuery(Guid DocumentId)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>>;
