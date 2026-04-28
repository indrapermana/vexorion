using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InventoryAdjustmentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<InventoryAdjustment>(currentTenantProvider)
{
    public async Task<ServiceResult<InventoryAdjustmentDetailsResponse>> CreateAsync(CreateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default)
    {
        var result = await base.CreateAsync(request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<InventoryAdjustmentDetailsResponse>> UpdateAsync(Guid inventoryAdjustmentId, UpdateInventoryAdjustmentRequest request, CancellationToken cancellationToken = default)
    {
        var result = await base.UpdateAsync(inventoryAdjustmentId, request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid inventoryAdjustmentId, CancellationToken cancellationToken = default)
        => base.DeleteAsync(inventoryAdjustmentId, dbContext, cancellationToken);

    protected override bool ValidateAddInput(ICreateInput<InventoryAdjustment> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateInventoryAdjustmentRequest request = (CreateInventoryAdjustmentRequest)input;
        var validation = Validate(request.AdjustmentNumber, request.WarehouseId, request.Reason);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<InventoryAdjustment>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<InventoryAdjustment> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateInventoryAdjustmentRequest request = (CreateInventoryAdjustmentRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        var exists = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.AdjustmentNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status409Conflict, "An inventory adjustment with the same number already exists.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<InventoryAdjustment> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateInventoryAdjustmentRequest request = (UpdateInventoryAdjustmentRequest)input;
        var validation = Validate(request.AdjustmentNumber, request.WarehouseId, request.Reason);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<InventoryAdjustment>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<InventoryAdjustment> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateInventoryAdjustmentRequest request = (UpdateInventoryAdjustmentRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var adjustment = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (adjustment is null)
        {
            return null;
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        var exists = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.AdjustmentNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status409Conflict, "An inventory adjustment with the same number already exists.");
        }

        if (HasPostedWarehouseChange(adjustment, request.WarehouseId))
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "Warehouse cannot be changed after inventory movements have been posted.");
        }

        if (IsCompletingWithoutActiveLines(adjustment, request.Status))
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing an inventory adjustment.");
        }

        if (!CanTransition(adjustment.Status, request.Status))
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(StatusCodes.Status400BadRequest, "The requested inventory adjustment status transition is not allowed.");
        }

        return null;
    }

    public override async Task<InventoryAdjustment> GetAddToDbObjectAsync(ICreateInput<InventoryAdjustment> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        CreateInventoryAdjustmentRequest request = (CreateInventoryAdjustmentRequest)input;
        created.AdjustmentNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        created.Reason = request.Reason.Trim();
        created.Notes = NormalizeOptional(request.Notes);

        return created;
    }

    protected override async Task<InventoryAdjustment> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<InventoryAdjustment> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        UpdateInventoryAdjustmentRequest request = (UpdateInventoryAdjustmentRequest)input;
        var adjustment = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (adjustment is null)
        {
            return null!;
        }

        request.Adapt(adjustment);
        adjustment.AdjustmentNumber = request.AdjustmentNumber.Trim().ToUpperInvariant();
        adjustment.Reason = request.Reason.Trim();
        adjustment.Notes = NormalizeOptional(request.Notes);

        return adjustment;
    }

    protected override async Task<ServiceResult<IEntityResponse<InventoryAdjustment>>?> ProcessUpdateSideEffectsAsync(
        Guid id,
        IUpdateInput<InventoryAdjustment> input,
        InventoryAdjustment updated,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var previousStatus = context.Entry(updated).Property(x => x.Status).OriginalValue;
        var movementResult = await inventoryMovementPostingService.ApplyInventoryAdjustmentStatusChangeAsync(
            updated,
            previousStatus,
            updated.Status,
            cancellationToken);

        if (!movementResult.Succeeded)
        {
            return ServiceResult<IEntityResponse<InventoryAdjustment>>.Failure(
                movementResult.StatusCode ?? StatusCodes.Status400BadRequest,
                movementResult.ErrorMessage ?? "Unable to post inventory adjustment movements.");
        }

        return null;
    }

    protected override async Task<ServiceResult<bool>?> ValidateDeleteBusinessRulesAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var adjustment = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (adjustment is null)
        {
            return null;
        }

        if (adjustment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Inventory adjustments can only be deleted while in Draft status.");
        }

        return null;
    }

    protected override IEntityResponse<InventoryAdjustment> BuildEntityResponse(InventoryAdjustment entity)
    {
        return entity.Adapt<InventoryAdjustmentDetailsResponse>();
    }

    protected override async Task<InventoryAdjustment> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var adjustment = await context.InventoryAdjustments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return adjustment ?? null!;
    }

    protected override string GetNotFoundMessage() => "Inventory adjustment not found.";

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

    private static ServiceResult<InventoryAdjustmentDetailsResponse> MapResult(ServiceResult<IEntityResponse<InventoryAdjustment>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<InventoryAdjustmentDetailsResponse>();
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
