using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ListGeneratedDocumentsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ListGeneratedDocumentsQuery, ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>> Handle(ListGeneratedDocumentsQuery request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.ListBySourceAsync(request.SourceType, request.SourceEntityId, cancellationToken);
    }
}
