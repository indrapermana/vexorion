using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockCountQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<StockCount>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<StockCount>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<StockCount>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var counts = await context.StockCounts.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .OrderByDescending(x => x.CountDate)
            .ThenBy(x => x.CountNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<StockCount>>>.Success(counts.Adapt<IReadOnlyCollection<IEntityListResponse<StockCount>>>());
    }

    public async Task<ServiceResult<IEntityResponse<StockCount>>> GetByIdAsync(Guid stockCountId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var stockCount = await context.StockCounts.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);

        return stockCount is null
            ? ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status404NotFound, "Stock count not found.")
            : ServiceResult<IEntityResponse<StockCount>>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }
}
