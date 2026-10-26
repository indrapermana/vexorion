using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetInventoryMovementAuditQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetInventoryMovementAuditQuery, ServiceResult<InventoryMovementAuditResponse>>
{
    public async ValueTask<ServiceResult<InventoryMovementAuditResponse>> Handle(GetInventoryMovementAuditQuery request, CancellationToken cancellationToken)
        => await serviceProvider.GetRequiredService<IInventoryReportingService>().GetMovementAuditAsync(
            request.StartDate,
            request.EndDate,
            request.WarehouseId,
            request.ProductId,
            request.Skip,
            request.Take,
            cancellationToken);
}