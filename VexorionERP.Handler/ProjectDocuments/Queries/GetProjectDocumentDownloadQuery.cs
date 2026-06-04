using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectDocumentDownloadQuery(Guid DocumentId)
    : IRequest<ServiceResult<ProjectDocumentDownloadResponse>>;
