using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetDocumentPdfPreviewQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetDocumentPdfPreviewQuery, ServiceResult<DocumentInlineContentResponse>>
{
    public async ValueTask<ServiceResult<DocumentInlineContentResponse>> Handle(GetDocumentPdfPreviewQuery request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.GetPdfPreviewAsync(request.GeneratedDocumentId, cancellationToken);
    }
}