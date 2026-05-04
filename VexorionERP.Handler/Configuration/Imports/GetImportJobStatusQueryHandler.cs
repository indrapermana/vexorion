using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetImportJobStatusQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetImportJobStatusQuery, ServiceResult<ImportJobStatusResponse>>
{
    public async ValueTask<ServiceResult<ImportJobStatusResponse>> Handle(GetImportJobStatusQuery request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.GetStatusAsync(request.ImportJobId, cancellationToken);
    }
}
