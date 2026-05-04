using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ValidateImportFileCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ValidateImportFileCommand, ServiceResult<ImportValidationResultResponse>>
{
    public async ValueTask<ServiceResult<ImportValidationResultResponse>> Handle(ValidateImportFileCommand request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.ValidateAsync(request.Request, cancellationToken);
    }
}
