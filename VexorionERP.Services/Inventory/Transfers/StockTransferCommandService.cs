using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockTransferCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : IStockTransferCommandService
{
    public async Task<ServiceResult<StockTransferDetailsResponse>> CreateAsync(CreateStockTransferRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.TransferNumber, request.SourceWarehouseId, request.DestinationWarehouseId);
        if (validation.Count > 0)
        {
            return ServiceResult<StockTransferDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.SourceWarehouseId, cancellationToken) || !await dbContext.Warehouses.AnyAsync(x => x.Id == request.DestinationWarehouseId, cancellationToken))
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Both source and destination warehouses must exist.");
        }

        var normalizedNumber = request.TransferNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.StockTransfers.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.TransferNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A stock transfer with the same number already exists.");
        }

        var transfer = request.Adapt<StockTransfer>();
        transfer.TenantId = currentTenantProvider.TenantId.Value;
        transfer.TransferNumber = normalizedNumber;
        transfer.Notes = NormalizeOptional(request.Notes);

        dbContext.StockTransfers.Add(transfer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockTransferDetailsResponse>.Success(transfer.Adapt<StockTransferDetailsResponse>());
    }

    public async Task<ServiceResult<StockTransferDetailsResponse>> UpdateAsync(Guid stockTransferId, UpdateStockTransferRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.TransferNumber, request.SourceWarehouseId, request.DestinationWarehouseId);
        if (validation.Count > 0)
        {
            return ServiceResult<StockTransferDetailsResponse>.ValidationFailure(validation);
        }

        var transfer = await dbContext.StockTransfers.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);
        if (transfer is null)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.SourceWarehouseId, cancellationToken) || !await dbContext.Warehouses.AnyAsync(x => x.Id == request.DestinationWarehouseId, cancellationToken))
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Both source and destination warehouses must exist.");
        }

        var normalizedNumber = request.TransferNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.StockTransfers.AnyAsync(x => x.Id != stockTransferId && x.TenantId == currentTenantProvider.TenantId.Value && x.TransferNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A stock transfer with the same number already exists.");
        }

        if (HasPostedWarehouseChange(transfer, request.SourceWarehouseId, request.DestinationWarehouseId))
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Source and destination warehouses cannot be changed after inventory movements have been posted.");
        }

        if (IsCompletingWithoutActiveLines(transfer, request.Status))
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing a stock transfer.");
        }

        if (!CanTransition(transfer.Status, request.Status))
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "The requested stock transfer status transition is not allowed.");
        }

        var previousStatus = transfer.Status;
        request.Adapt(transfer);
        transfer.TransferNumber = normalizedNumber;
        transfer.Notes = NormalizeOptional(request.Notes);

        var movementResult = await inventoryMovementPostingService.ApplyStockTransferStatusChangeAsync(transfer, previousStatus, request.Status, cancellationToken);
        if (!movementResult.Succeeded)
        {
            return ServiceResult<StockTransferDetailsResponse>.Failure(movementResult.StatusCode ?? StatusCodes.Status400BadRequest, movementResult.ErrorMessage ?? "Unable to post stock transfer movements.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<StockTransferDetailsResponse>.Success(transfer.Adapt<StockTransferDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid stockTransferId, CancellationToken cancellationToken = default)
    {
        var transfer = await dbContext.StockTransfers.FirstOrDefaultAsync(x => x.Id == stockTransferId, cancellationToken);
        if (transfer is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock transfer not found.");
        }

        if (transfer.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock transfers can only be deleted while in Draft status.");
        }

        dbContext.StockTransfers.Remove(transfer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string transferNumber, Guid sourceWarehouseId, Guid destinationWarehouseId)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(transferNumber)) errors[nameof(CreateStockTransferRequest.TransferNumber)] = ["Transfer number is required."];
        if (sourceWarehouseId == Guid.Empty) errors[nameof(CreateStockTransferRequest.SourceWarehouseId)] = ["Source warehouse is required."];
        if (destinationWarehouseId == Guid.Empty) errors[nameof(CreateStockTransferRequest.DestinationWarehouseId)] = ["Destination warehouse is required."];
        if (sourceWarehouseId == destinationWarehouseId && sourceWarehouseId != Guid.Empty) errors[nameof(CreateStockTransferRequest.DestinationWarehouseId)] = ["Destination warehouse must differ from the source warehouse."];
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

    private static bool HasPostedWarehouseChange(StockTransfer transfer, Guid requestedSourceWarehouseId, Guid requestedDestinationWarehouseId)
        => transfer.Status != DocumentStatus.Draft
            && (transfer.SourceWarehouseId != requestedSourceWarehouseId || transfer.DestinationWarehouseId != requestedDestinationWarehouseId);

    private static bool IsCompletingWithoutActiveLines(StockTransfer transfer, DocumentStatus requestedStatus)
        => requestedStatus == DocumentStatus.Completed && transfer.Lines.All(x => !x.IsActive);

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
