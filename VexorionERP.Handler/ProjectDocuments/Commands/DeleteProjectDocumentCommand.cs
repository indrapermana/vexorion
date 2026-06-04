using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProjectDocumentCommand(Guid DocumentId)
    : IRequest<ServiceResult<bool>>;
