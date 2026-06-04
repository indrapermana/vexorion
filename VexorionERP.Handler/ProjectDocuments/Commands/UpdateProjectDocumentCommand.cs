using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProjectDocumentCommand(Guid DocumentId, UpdateProjectDocumentRequest Request)
    : IRequest<ServiceResult<ProjectDocumentDetailsResponse>>;
