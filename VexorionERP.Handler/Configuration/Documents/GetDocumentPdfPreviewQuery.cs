using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDocumentPdfPreviewQuery(Guid GeneratedDocumentId) : IRequest<ServiceResult<DocumentInlineContentResponse>>;