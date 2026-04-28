using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class WarehouseQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IWarehouseQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var warehouses = await dbContext.Warehouses.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>.Success(warehouses.Adapt<IReadOnlyCollection<WarehouseListItemResponse>>());
    }

    public async Task<ServiceResult<WarehouseDetailsResponse>> GetByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var warehouse = await dbContext.Warehouses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == warehouseId, cancellationToken);
        return warehouse is null
            ? ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Warehouse not found.")
            : ServiceResult<WarehouseDetailsResponse>.Success(warehouse.Adapt<WarehouseDetailsResponse>());
    }
}
