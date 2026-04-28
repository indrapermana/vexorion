using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InventoryBalanceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInventoryBalanceQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var balances = await dbContext.InventoryBalances.AsNoTracking().OrderBy(x => x.ProductId).ThenBy(x => x.WarehouseId).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>.Success(balances.Adapt<IReadOnlyCollection<InventoryBalanceListItemResponse>>());
    }

    public async Task<ServiceResult<InventoryBalanceDetailsResponse>> GetByIdAsync(Guid inventoryBalanceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var balance = await dbContext.InventoryBalances.AsNoTracking().FirstOrDefaultAsync(x => x.Id == inventoryBalanceId, cancellationToken);
        return balance is null
            ? ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory balance not found.")
            : ServiceResult<InventoryBalanceDetailsResponse>.Success(balance.Adapt<InventoryBalanceDetailsResponse>());
    }
}
