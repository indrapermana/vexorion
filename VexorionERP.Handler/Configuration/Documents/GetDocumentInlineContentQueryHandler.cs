using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetDocumentInlineContentQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetDocumentInlineContentQuery, ServiceResult<DocumentInlineContentResponse>>
{
    public async ValueTask<ServiceResult<DocumentInlineContentResponse>> Handle(GetDocumentInlineContentQuery request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.GetInlineContentAsync(request.GeneratedDocumentId, cancellationToken);
    }
}
