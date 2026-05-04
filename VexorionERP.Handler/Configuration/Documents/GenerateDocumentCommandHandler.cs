using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GenerateDocumentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GenerateDocumentCommand, ServiceResult<GeneratedDocumentResponse>>
{
    public async ValueTask<ServiceResult<GeneratedDocumentResponse>> Handle(GenerateDocumentCommand request, CancellationToken cancellationToken)
    {
        var generatedDocumentService = serviceProvider.GetRequiredService<IGeneratedDocumentService>();
        return await generatedDocumentService.GenerateAsync(request.Request, cancellationToken);
    }
}
