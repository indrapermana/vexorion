using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetImportHistoryQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetImportHistoryQuery, ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>> Handle(
        GetImportHistoryQuery request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.GetHistoryAsync(request.ImportType, request.Page, request.PageSize, cancellationToken);
    }
}
