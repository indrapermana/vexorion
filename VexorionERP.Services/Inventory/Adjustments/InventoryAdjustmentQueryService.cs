using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InventoryAdjustmentQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<InventoryAdjustment>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryAdjustment>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryAdjustment>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var adjustments = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .OrderByDescending(x => x.AdjustmentDate)
            .ThenBy(x => x.AdjustmentNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryAdjustment>>>.Success(AdaptEntityListResponses(adjustments));
    }

    public async Task<ServiceResult<IEntityResponse<InventoryAdjustment>>> GetByIdAsync(Guid inventoryAdjustmentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var adjustment = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);

        return adjustment is null
            ? ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.")
            : ServiceResult<IEntityResponse<InventoryAdjustment>>.Success(adjustment.Adapt<InventoryAdjustmentDetailsResponse>());
    }
}
