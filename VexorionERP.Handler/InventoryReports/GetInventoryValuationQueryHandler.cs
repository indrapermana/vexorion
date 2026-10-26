using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetInventoryValuationQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetInventoryValuationQuery, ServiceResult<InventoryValuationReportResponse>>
{
    public async ValueTask<ServiceResult<InventoryValuationReportResponse>> Handle(GetInventoryValuationQuery request, CancellationToken cancellationToken)
        => await serviceProvider.GetRequiredService<IInventoryReportingService>().GetValuationAsync(request.WarehouseId, cancellationToken);
}