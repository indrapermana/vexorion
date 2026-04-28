using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockTransferQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<StockTransfer>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<StockTransfer>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<StockTransfer>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var transfers = await context.StockTransfers.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .OrderByDescending(x => x.TransferDate)
            .ThenBy(x => x.TransferNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<StockTransfer>>>.Success(transfers.Adapt<IReadOnlyCollection<IEntityListResponse<StockTransfer>>>());
    }

    public async Task<ServiceResult<IEntityResponse<StockTransfer>>> GetByIdAsync(Guid stockTransferId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var transfer = await context.StockTransfers.GetByTenant(tenantId.Value)
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);

        return transfer is null
            ? ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.")
            : ServiceResult<IEntityResponse<StockTransfer>>.Success(transfer.Adapt<StockTransferDetailsResponse>());
    }
}
