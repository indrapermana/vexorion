using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record RegenerateDocumentCommand(Guid GeneratedDocumentId) : IRequest<ServiceResult<GeneratedDocumentResponse>>;
