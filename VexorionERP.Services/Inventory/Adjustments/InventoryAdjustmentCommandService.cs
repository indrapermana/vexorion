using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InventoryAdjustmentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : IInventoryAdjustmentCommandService
{
    public async Task<ServiceResult<InventoryAdjustmentDetailsResponse>> CreateAsync(CreateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.AdjustmentNumber, request.WarehouseId, request.Reason);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.InventoryAdjustments.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.AdjustmentNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An inventory adjustment with the same number already exists.");
        }

        var adjustment = request.Adapt<InventoryAdjustment>();
        adjustment.TenantId = currentTenantProvider.TenantId.Value;
        adjustment.AdjustmentNumber = normalizedNumber;
        adjustment.Reason = request.Reason.Trim();
        adjustment.Notes = NormalizeOptional(request.Notes);

        dbContext.InventoryAdjustments.Add(adjustment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryAdjustmentDetailsResponse>.Success(adjustment.Adapt<InventoryAdjustmentDetailsResponse>());
    }

    public async Task<ServiceResult<InventoryAdjustmentDetailsResponse>> UpdateAsync(Guid inventoryAdjustmentId, UpdateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.AdjustmentNumber, request.WarehouseId, request.Reason);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.ValidationFailure(validation);
        }

        var adjustment = await dbContext.InventoryAdjustments.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);
        if (adjustment is null)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.InventoryAdjustments.AnyAsync(x => x.Id != inventoryAdjustmentId && x.TenantId == currentTenantProvider.TenantId.Value && x.AdjustmentNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An inventory adjustment with the same number already exists.");
        }

        if (HasPostedWarehouseChange(adjustment, request.WarehouseId))
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse cannot be changed after inventory movements have been posted.");
        }

        if (IsCompletingWithoutActiveLines(adjustment, request.Status))
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing an inventory adjustment.");
        }

        if (!CanTransition(adjustment.Status, request.Status))
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "The requested inventory adjustment status transition is not allowed.");
        }

        var previousStatus = adjustment.Status;
        request.Adapt(adjustment);
        adjustment.AdjustmentNumber = normalizedNumber;
        adjustment.Reason = request.Reason.Trim();
        adjustment.Notes = NormalizeOptional(request.Notes);

        var movementResult = await inventoryMovementPostingService.ApplyInventoryAdjustmentStatusChangeAsync(adjustment, previousStatus, request.Status, cancellationToken);
        if (!movementResult.Succeeded)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(movementResult.StatusCode ?? StatusCodes.Status400BadRequest, movementResult.ErrorMessage ?? "Unable to post inventory adjustment movements.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryAdjustmentDetailsResponse>.Success(adjustment.Adapt<InventoryAdjustmentDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default)
    {
        var adjustment = await dbContext.InventoryAdjustments.FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);
        if (adjustment is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.");
        }

        if (adjustment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Inventory adjustments can only be deleted while in Draft status.");
        }

        dbContext.InventoryAdjustments.Remove(adjustment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string adjustmentNumber, Guid warehouseId, string reason)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(adjustmentNumber)) errors[nameof(CreateInventoryAdjustmentRequest.AdjustmentNumber)] = ["Adjustment number is required."];
        if (warehouseId == Guid.Empty) errors[nameof(CreateInventoryAdjustmentRequest.WarehouseId)] = ["Warehouse is required."];
        if (string.IsNullOrWhiteSpace(reason)) errors[nameof(CreateInventoryAdjustmentRequest.Reason)] = ["Reason is required."];
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

    private static bool HasPostedWarehouseChange(InventoryAdjustment adjustment, Guid requestedWarehouseId)
        => adjustment.Status != DocumentStatus.Draft && adjustment.WarehouseId != requestedWarehouseId;

    private static bool IsCompletingWithoutActiveLines(InventoryAdjustment adjustment, DocumentStatus requestedStatus)
        => requestedStatus == DocumentStatus.Completed && adjustment.Lines.All(x => !x.IsActive);

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}