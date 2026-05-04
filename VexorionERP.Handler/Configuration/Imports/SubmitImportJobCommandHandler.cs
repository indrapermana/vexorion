using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class SubmitImportJobCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<SubmitImportJobCommand, ServiceResult<ImportJobStatusResponse>>
{
    public async ValueTask<ServiceResult<ImportJobStatusResponse>> Handle(SubmitImportJobCommand request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.SubmitAsync(request.ImportJobId, cancellationToken);
    }
}
