using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class RegenerateDocumentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<RegenerateDocumentCommand, ServiceResult<GeneratedDocumentResponse>>
{
    public async ValueTask<ServiceResult<GeneratedDocumentResponse>> Handle(RegenerateDocumentCommand request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.RegenerateAsync(request.GeneratedDocumentId, cancellationToken);
    }
}
