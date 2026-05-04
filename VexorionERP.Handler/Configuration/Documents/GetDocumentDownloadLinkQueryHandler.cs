using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetDocumentDownloadLinkQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetDocumentDownloadLinkQuery, ServiceResult<GetDocumentDownloadLinkResponse>>
{
    public async ValueTask<ServiceResult<GetDocumentDownloadLinkResponse>> Handle(GetDocumentDownloadLinkQuery request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.GetDownloadLinkAsync(request.GeneratedDocumentId, cancellationToken);
    }
}
