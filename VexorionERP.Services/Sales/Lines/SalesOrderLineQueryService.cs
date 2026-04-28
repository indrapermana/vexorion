using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesOrderLineQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseLineQueryService<SalesOrder, SalesOrderLine>(currentTenantProvider)
{
    protected override string LineNotFoundMessage => "Sales order line not found.";

    protected override async Task<IReadOnlyCollection<IEntityListResponse<SalesOrderLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var lines = await context.GetByTenant<SalesOrderLine>(TenantId)
            .AsNoTracking()
            .Where(x => x.SalesOrderId == parentId)
            .ToListAsync(cancellationToken);

        return lines.Adapt<IReadOnlyCollection<SalesOrderLineListItemResponse>>()
            .Cast<IEntityListResponse<SalesOrderLine>>()
            .ToArray();
    }

    protected override async Task<IEntityResponse<SalesOrderLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken)
    {
        var line = await context.GetByTenant<SalesOrderLine>(TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SalesOrderId == parentId && x.Id == lineId, cancellationToken);

        return line?.Adapt<SalesOrderLineDetailsResponse>();
    }
}
