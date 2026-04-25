using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class StockTransferQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IStockTransferQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<StockTransferListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<StockTransferListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var transfers = await dbContext.StockTransfers
            .AsNoTracking()
            .OrderByDescending(x => x.TransferDate)
            .ThenBy(x => x.TransferNumber)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<StockTransferListItemResponse>>.Success(transfers.Adapt<IReadOnlyCollection<StockTransferListItemResponse>>());
    }

    public async Task<ServiceResult<StockTransferDetailsResponse>> GetByIdAsync(Guid stockTransferId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var transfer = await dbContext.StockTransfers
            .AsNoTracking()
            .Include(x => x.Lines.Where(line => line.IsActive))
            .FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);

        return transfer is null
            ? ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.")
            : ServiceResult<StockTransferDetailsResponse>.Success(transfer.Adapt<StockTransferDetailsResponse>());
    }
}