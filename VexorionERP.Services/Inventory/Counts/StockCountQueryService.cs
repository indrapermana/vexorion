using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockCountQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IStockCountQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var counts = await dbContext.StockCounts
            .AsNoTracking()
            .OrderByDescending(x => x.CountDate)
            .ThenBy(x => x.CountNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>.Success(counts.Adapt<IReadOnlyCollection<StockCountListItemResponse>>());
    }

    public async Task<ServiceResult<StockCountDetailsResponse>> GetByIdAsync(Guid stockCountId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var stockCount = await dbContext.StockCounts
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);

        return stockCount is null
            ? ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock count not found.")
            : ServiceResult<StockCountDetailsResponse>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }
}
