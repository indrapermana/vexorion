using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class WarehouseQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<Warehouse>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var warehouses = await context.Warehouses.GetByTenant(tenantId.Value).AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>>.Success(warehouses.Adapt<IReadOnlyCollection<IEntityListResponse<Warehouse>>>());
    }

    public async Task<ServiceResult<IEntityResponse<Warehouse>>> GetByIdAsync(Guid warehouseId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<Warehouse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var warehouse = await context.Warehouses.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == warehouseId, cancellationToken);
        return warehouse is null
            ? ServiceResult<IEntityResponse<Warehouse>>.Failure(StatusCodes.Status404NotFound, "Warehouse not found.")
            : ServiceResult<IEntityResponse<Warehouse>>.Success(warehouse.Adapt<WarehouseDetailsResponse>());
    }
}
