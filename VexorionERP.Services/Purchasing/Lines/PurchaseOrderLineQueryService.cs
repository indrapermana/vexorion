using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseOrderLineQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseLineQueryService<PurchaseOrder, PurchaseOrderLine>(currentTenantProvider)
{
    protected override string LineNotFoundMessage => "Purchase order line not found.";

    protected override async Task<IReadOnlyCollection<IEntityListResponse<PurchaseOrderLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var lines = await context.GetByTenant<PurchaseOrderLine>(TenantId)
            .AsNoTracking()
            .Where(x => x.PurchaseOrderId == parentId)
            .ToListAsync(cancellationToken);

        return lines.Adapt<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>()
            .Cast<IEntityListResponse<PurchaseOrderLine>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<PurchaseOrderLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken)
    {
        var line = await context.GetByTenant<PurchaseOrderLine>(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.PurchaseOrderId == parentId && x.Id == lineId, cancellationToken);

        return line?.Adapt<PurchaseOrderLineDetailsResponse>();
    }
}
