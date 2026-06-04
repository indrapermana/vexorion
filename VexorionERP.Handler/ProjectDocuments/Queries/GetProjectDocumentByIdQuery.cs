using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectDocumentByIdQuery(Guid DocumentId)
    : IRequest<ServiceResult<ProjectDocumentDetailsResponse>>;
