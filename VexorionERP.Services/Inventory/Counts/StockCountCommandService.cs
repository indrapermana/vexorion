using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class StockCountCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : IStockCountCommandService
{
    public async Task<ServiceResult<StockCountDetailsResponse>> CreateAsync(CreateStockCountRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CountNumber, request.WarehouseId);
        if (validation.Count > 0)
        {
            return ServiceResult<StockCountDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.CountNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.StockCounts.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.CountNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A stock count with the same number already exists.");
        }

        var stockCount = request.Adapt<StockCount>();
        stockCount.TenantId = currentTenantProvider.TenantId.Value;
        stockCount.CountNumber = normalizedNumber;
        stockCount.Notes = NormalizeOptional(request.Notes);

        dbContext.StockCounts.Add(stockCount);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockCountDetailsResponse>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }

    public async Task<ServiceResult<StockCountDetailsResponse>> UpdateAsync(Guid stockCountId, UpdateStockCountRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CountNumber, request.WarehouseId);
        if (validation.Count > 0)
        {
            return ServiceResult<StockCountDetailsResponse>.ValidationFailure(validation);
        }

        var stockCount = await dbContext.StockCounts.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);
        if (stockCount is null)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.CountNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.StockCounts.AnyAsync(x => x.Id != stockCountId && x.TenantId == currentTenantProvider.TenantId.Value && x.CountNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A stock count with the same number already exists.");
        }

        if (HasPostedWarehouseChange(stockCount, request.WarehouseId))
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse cannot be changed after inventory movements have been posted.");
        }

        if (IsCompletingWithoutActiveLines(stockCount, request.Status))
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing a stock count.");
        }

        if (!CanTransition(stockCount.Status, request.Status))
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "The requested stock count status transition is not allowed.");
        }

        var previousStatus = stockCount.Status;
        request.Adapt(stockCount);
        stockCount.CountNumber = normalizedNumber;
        stockCount.Notes = NormalizeOptional(request.Notes);

        var movementResult = await inventoryMovementPostingService.ApplyStockCountStatusChangeAsync(stockCount, previousStatus, request.Status, cancellationToken);
        if (!movementResult.Succeeded)
        {
            return ServiceResult<StockCountDetailsResponse>.Failure(movementResult.StatusCode ?? StatusCodes.Status400BadRequest, movementResult.ErrorMessage ?? "Unable to post stock count movements.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockCountDetailsResponse>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, CancellationToken cancellationToken = default)
    {
        var stockCount = await dbContext.StockCounts.FirstOrDefaultAsync(x => x.Id == stockCountId, cancellationToken);
        if (stockCount is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");
        }

        if (stockCount.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock counts can only be deleted while in Draft status.");
        }

        dbContext.StockCounts.Remove(stockCount);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string countNumber, Guid warehouseId)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(countNumber)) errors[nameof(CreateStockCountRequest.CountNumber)] = ["Count number is required."];
        if (warehouseId == Guid.Empty) errors[nameof(CreateStockCountRequest.WarehouseId)] = ["Warehouse is required."];
        return errors;
    }

    private static bool CanTransition(DocumentStatus previousStatus, DocumentStatus newStatus)
    {
        if (previousStatus == newStatus)
        {
            return true;
        }

        return previousStatus switch
        {
            DocumentStatus.Draft => newStatus is DocumentStatus.Completed or DocumentStatus.Cancelled,
            DocumentStatus.Completed => newStatus == DocumentStatus.Cancelled,
            _ => false,
        };
    }

    private static bool HasPostedWarehouseChange(StockCount stockCount, Guid requestedWarehouseId)
        => stockCount.Status != DocumentStatus.Draft && stockCount.WarehouseId != requestedWarehouseId;

    private static bool IsCompletingWithoutActiveLines(StockCount stockCount, DocumentStatus requestedStatus)
        => requestedStatus == DocumentStatus.Completed && stockCount.Lines.All(x => !x.IsActive);

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
