using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ChangeProjectDocumentStatusCommand(Guid DocumentId, ChangeProjectDocumentStatusRequest Request)
    : IRequest<ServiceResult<ProjectDocumentDetailsResponse>>;
