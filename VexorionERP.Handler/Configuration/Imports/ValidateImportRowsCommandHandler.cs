using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ValidateImportRowsCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ValidateImportRowsCommand, ServiceResult<ImportValidationResultResponse>>
{
    public async ValueTask<ServiceResult<ImportValidationResultResponse>> Handle(
        ValidateImportRowsCommand request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.ValidateRowsAsync(request.Request, cancellationToken);
    }
}