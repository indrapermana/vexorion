using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GenerateDocumentCommand(GenerateDocumentRequest Request) : IRequest<ServiceResult<GeneratedDocumentResponse>>;
