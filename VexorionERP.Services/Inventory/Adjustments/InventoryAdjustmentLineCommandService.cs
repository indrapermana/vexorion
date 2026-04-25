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

public class InventoryAdjustmentLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInventoryAdjustmentLineCommandService
{
    public async Task<ServiceResult<InventoryAdjustmentLineDetailsResponse>> CreateAsync(Guid inventoryAdjustmentId, CreateInventoryAdjustmentLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(inventoryAdjustmentId, request.ProductId, request.QuantityDelta, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.ValidationFailure(validation);
        }

        var adjustment = await dbContext.InventoryAdjustments.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);
        if (adjustment is null)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.");
        }

        if (adjustment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Inventory adjustment lines can only be modified while the document is in Draft status.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(adjustment, request.ProductId))
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An active adjustment line already exists for this product.");
        }

        var line = request.Adapt<InventoryAdjustmentLine>();
        line.TenantId = currentTenantProvider.TenantId ?? adjustment.TenantId;
        line.InventoryAdjustmentId = inventoryAdjustmentId;
        line.Reason = NormalizeOptional(request.Reason);

        dbContext.InventoryAdjustmentLines.Add(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Success(line.Adapt<InventoryAdjustmentLineDetailsResponse>());
    }

    public async Task<ServiceResult<InventoryAdjustmentLineDetailsResponse>> UpdateAsync(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, UpdateInventoryAdjustmentLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(inventoryAdjustmentId, request.ProductId, request.QuantityDelta, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.ValidationFailure(validation);
        }

        var adjustment = await dbContext.InventoryAdjustments.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);
        if (adjustment is null)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.");
        }

        if (adjustment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Inventory adjustment lines can only be modified while the document is in Draft status.");
        }

        var line = adjustment.Lines.FirstOrDefault(x => x.Id == inventoryAdjustmentLineId);
        if (line is null)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (HasDuplicateProductLine(adjustment, request.ProductId, inventoryAdjustmentLineId))
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An active adjustment line already exists for this product.");
        }

        request.Adapt(line);
        line.Reason = NormalizeOptional(request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Success(line.Adapt<InventoryAdjustmentLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, CancellationToken cancellationToken = default)
    {
        var adjustment = await dbContext.InventoryAdjustments.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == inventoryAdjustmentId, cancellationToken);
        if (adjustment is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment not found.");
        }

        if (adjustment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Inventory adjustment lines can only be modified while the document is in Draft status.");
        }

        var line = adjustment.Lines.FirstOrDefault(x => x.Id == inventoryAdjustmentLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Inventory adjustment line not found.");
        }

        dbContext.InventoryAdjustmentLines.Remove(line);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid inventoryAdjustmentId, Guid productId, decimal quantityDelta, decimal unitCost)
    {
        var errors = new Dictionary<string, string[]>();
        if (inventoryAdjustmentId == Guid.Empty) errors[nameof(CreateInventoryAdjustmentLineRequest)] = ["Inventory adjustment is required."];
        if (productId == Guid.Empty) errors[nameof(CreateInventoryAdjustmentLineRequest.ProductId)] = ["Product is required."];
        if (quantityDelta == 0) errors[nameof(CreateInventoryAdjustmentLineRequest.QuantityDelta)] = ["Quantity delta cannot be zero."];
        if (unitCost < 0) errors[nameof(CreateInventoryAdjustmentLineRequest.UnitCost)] = ["Unit cost cannot be negative."];
        return errors;
    }

    private static bool HasDuplicateProductLine(InventoryAdjustment adjustment, Guid productId, Guid? excludingLineId = null)
        => adjustment.Lines.Any(x => x.IsActive && x.ProductId == productId && x.Id != excludingLineId);

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}