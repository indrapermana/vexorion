using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InventoryAdjustmentQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInventoryAdjustmentQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var adjustments = await dbContext.InventoryAdjustments
            .AsNoTracking()
            .OrderByDescending(x => x.AdjustmentDate)
            .ThenBy(x => x.AdjustmentNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>.Success(adjustments.Adapt<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>());
    }

    public async Task<ServiceResult<InventoryAdjustmentDetailsResponse>> GetByIdAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var adjustment = await dbContext.InventoryAdjustments
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);

        return adjustment is null
            ? ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.")
            : ServiceResult<InventoryAdjustmentDetailsResponse>.Success(adjustment.Adapt<InventoryAdjustmentDetailsResponse>());
    }
}