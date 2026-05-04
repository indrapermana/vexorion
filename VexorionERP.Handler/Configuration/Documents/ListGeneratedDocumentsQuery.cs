using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ListGeneratedDocumentsQuery(
    GeneratedDocumentSourceType SourceType,
    Guid SourceEntityId) : IRequest<ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>>;
