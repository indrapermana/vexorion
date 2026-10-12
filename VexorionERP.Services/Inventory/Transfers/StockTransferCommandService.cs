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
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<StockTransfer>(currentTenantProvider)
{
    public async Task<ServiceResult<StockTransferDetailsResponse>> CreateAsync(CreateStockTransferRequest request, CancellationToken cancellationToken = default)
    {
        var result = await base.CreateAsync(request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<StockTransferDetailsResponse>> UpdateAsync(Guid stockTransferId, UpdateStockTransferRequest request, CancellationToken cancellationToken = default)
    {
        var result = await base.UpdateAsync(stockTransferId, request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid stockTransferId, CancellationToken cancellationToken = default)
        => base.DeleteAsync(stockTransferId, dbContext, cancellationToken);

    protected override bool ValidateAddInput(ICreateInput<StockTransfer> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateStockTransferRequest request = (CreateStockTransferRequest)input;
        var validation = Validate(request.TransferNumber, request.SourceWarehouseId, request.DestinationWarehouseId);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<StockTransfer>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<StockTransfer> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateStockTransferRequest request = (CreateStockTransferRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var sourceExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.SourceWarehouseId, cancellationToken);
        var destinationExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.DestinationWarehouseId, cancellationToken);

        if (!sourceExists || !destinationExists)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "Both source and destination warehouses must exist.");
        }

        var normalizedNumber = request.TransferNumber.Trim().ToUpperInvariant();
        var exists = await context.StockTransfers.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.TransferNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status409Conflict, "A stock transfer with the same number already exists.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<StockTransfer> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateStockTransferRequest request = (UpdateStockTransferRequest)input;
        var validation = Validate(request.TransferNumber, request.SourceWarehouseId, request.DestinationWarehouseId);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<StockTransfer>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<StockTransfer> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateStockTransferRequest request = (UpdateStockTransferRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var transfer = await context.StockTransfers.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (transfer is null)
        {
            return null;
        }

        var sourceExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.SourceWarehouseId, cancellationToken);
        var destinationExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.DestinationWarehouseId, cancellationToken);

        if (!sourceExists || !destinationExists)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "Both source and destination warehouses must exist.");
        }

        var normalizedNumber = request.TransferNumber.Trim().ToUpperInvariant();
        var exists = await context.StockTransfers.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.TransferNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status409Conflict, "A stock transfer with the same number already exists.");
        }

        if (HasPostedWarehouseChange(transfer, request.SourceWarehouseId, request.DestinationWarehouseId))
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "Source and destination warehouses cannot be changed after inventory movements have been posted.");
        }

        if (IsCompletingWithoutActiveLines(transfer, request.Status))
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing a stock transfer.");
        }

        if (!CanTransition(transfer.Status, request.Status))
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(StatusCodes.Status400BadRequest, "The requested stock transfer status transition is not allowed.");
        }

        return null;
    }

    public override async Task<StockTransfer> GetAddToDbObjectAsync(ICreateInput<StockTransfer> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        CreateStockTransferRequest request = (CreateStockTransferRequest)input;
        created.TransferNumber = request.TransferNumber.Trim().ToUpperInvariant();
        created.Notes = NormalizeOptional(request.Notes);

        return created;
    }

    protected override async Task<StockTransfer> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<StockTransfer> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        UpdateStockTransferRequest request = (UpdateStockTransferRequest)input;
        var transfer = await context.StockTransfers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (transfer is null)
        {
            return null!;
        }

        request.Adapt(transfer);
        transfer.TransferNumber = request.TransferNumber.Trim().ToUpperInvariant();
        transfer.Notes = NormalizeOptional(request.Notes);

        return transfer;
    }

    protected override async Task<ServiceResult<IEntityResponse<StockTransfer>>?> ProcessUpdateSideEffectsAsync(
        Guid id,
        IUpdateInput<StockTransfer> input,
        StockTransfer updated,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var previousStatus = context.Entry(updated).Property(x => x.Status).OriginalValue;
        var movementResult = await inventoryMovementPostingService.ApplyStockTransferStatusChangeAsync(
            updated,
            previousStatus,
            updated.Status,
            cancellationToken);

        if (!movementResult.Succeeded)
        {
            return ServiceResult<IEntityResponse<StockTransfer>>.Failure(
                movementResult.StatusCode ?? StatusCodes.Status400BadRequest,
                movementResult.ErrorMessage ?? "Unable to post stock transfer movements.",
                movementResult.ErrorCode);
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

        var transfer = await context.StockTransfers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (transfer is null)
        {
            return null;
        }

        if (transfer.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock transfers can only be deleted while in Draft status.");
        }

        return null;
    }

    protected override IEntityResponse<StockTransfer> BuildEntityResponse(StockTransfer entity)
    {
        return entity.Adapt<StockTransferDetailsResponse>();
    }

    protected override async Task<StockTransfer> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var transfer = await context.StockTransfers.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return transfer ?? null!;
    }

    protected override string GetNotFoundMessage() => "Stock transfer not found.";

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

    private static ServiceResult<StockTransferDetailsResponse> MapResult(ServiceResult<IEntityResponse<StockTransfer>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<StockTransferDetailsResponse>();
            return ServiceResult<StockTransferDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<StockTransferDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<StockTransferDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
