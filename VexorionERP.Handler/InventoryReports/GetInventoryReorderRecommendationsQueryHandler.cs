using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetInventoryReorderRecommendationsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetInventoryReorderRecommendationsQuery, ServiceResult<InventoryReorderReportResponse>>
{
    public async ValueTask<ServiceResult<InventoryReorderReportResponse>> Handle(GetInventoryReorderRecommendationsQuery request, CancellationToken cancellationToken)
        => await serviceProvider.GetRequiredService<IInventoryReportingService>().GetReorderRecommendationsAsync(cancellationToken);
}