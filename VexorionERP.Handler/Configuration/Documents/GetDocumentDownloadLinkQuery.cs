using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDocumentDownloadLinkQuery(Guid GeneratedDocumentId) : IRequest<ServiceResult<GetDocumentDownloadLinkResponse>>;
