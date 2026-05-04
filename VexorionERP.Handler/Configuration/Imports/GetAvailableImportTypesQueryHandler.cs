using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetAvailableImportTypesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetAvailableImportTypesQuery, ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<AvailableImportTypeResponse>>> Handle(GetAvailableImportTypesQuery request, CancellationToken cancellationToken)
    {
        var importJobService = serviceProvider.GetRequiredService<IImportJobService>();
        return await importJobService.GetAvailableImportTypesAsync(cancellationToken);
    }
}
