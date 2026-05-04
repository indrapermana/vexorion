using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDocumentInlineContentQuery(Guid GeneratedDocumentId) : IRequest<ServiceResult<DocumentInlineContentResponse>>;
