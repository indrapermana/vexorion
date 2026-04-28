using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InventoryBalanceQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<InventoryBalance>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryBalance>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryBalance>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var balances = await context.InventoryBalances.GetByTenant(tenantId.Value).AsNoTracking().OrderBy(x => x.ProductId).ThenBy(x => x.WarehouseId).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<InventoryBalance>>>.Success(balances.Adapt<IReadOnlyCollection<IEntityListResponse<InventoryBalance>>>());
    }

    public async Task<ServiceResult<IEntityResponse<InventoryBalance>>> GetByIdAsync(Guid inventoryBalanceId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var balance = await context.InventoryBalances.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == inventoryBalanceId, cancellationToken);
        return balance is null
            ? ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status404NotFound, "Inventory balance not found.")
            : ServiceResult<IEntityResponse<InventoryBalance>>.Success(balance.Adapt<InventoryBalanceDetailsResponse>());
    }
}
