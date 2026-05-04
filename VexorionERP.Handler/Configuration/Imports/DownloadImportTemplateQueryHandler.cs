using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DownloadImportTemplateQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<DownloadImportTemplateQuery, ServiceResult<ImportTemplateResponse>>
{
    public async ValueTask<ServiceResult<ImportTemplateResponse>> Handle(DownloadImportTemplateQuery request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.DownloadTemplateAsync(request.ImportType, cancellationToken);
    }
}
