using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class StockCountCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<StockCount>(currentTenantProvider)
{
    // Compatibility wrappers used by tests and existing code
    public async Task<ServiceResult<StockCountDetailsResponse>> CreateAsync(CreateStockCountRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<StockCount>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<StockCountDetailsResponse>> UpdateAsync(Guid stockCountId, UpdateStockCountRequest request, CancellationToken cancellationToken = default)
    {
        var result = await UpdateAsync(stockCountId, (IUpdateInput<StockCount>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid stockCountId, CancellationToken cancellationToken = default)
        => DeleteAsync(stockCountId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<StockCount>>> CreateAsync(ICreateInput<StockCount> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var createRequest = (CreateStockCountRequest)request;

        var validation = Validate(createRequest.CountNumber, createRequest.WarehouseId);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<StockCount>>.ValidationFailure(validation);

        if (!await context.Warehouses.AnyAsync(x => x.Id == createRequest.WarehouseId, cancellationToken))
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");

        var normalizedNumber = createRequest.CountNumber.Trim().ToUpperInvariant();
        var exists = await context.StockCounts.AnyAsync(x => x.TenantId == tenantId.Value && x.CountNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status409Conflict, "A stock count with the same number already exists.");

        var stockCount = createRequest.Adapt<StockCount>();
        stockCount.TenantId = tenantId.Value;
        stockCount.CountNumber = normalizedNumber;
        stockCount.Notes = NormalizeOptional(createRequest.Notes);

        context.StockCounts.Add(stockCount);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<StockCount>>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }

    public override async Task<ServiceResult<IEntityResponse<StockCount>>> UpdateAsync(Guid id, IUpdateInput<StockCount> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var updateRequest = (UpdateStockCountRequest)request;

        var validation = Validate(updateRequest.CountNumber, updateRequest.WarehouseId);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<StockCount>>.ValidationFailure(validation);

        var stockCount = await context.StockCounts.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (stockCount is null)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");

        if (!await context.Warehouses.AnyAsync(x => x.Id == updateRequest.WarehouseId, cancellationToken))
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");

        var normalizedNumber = updateRequest.CountNumber.Trim().ToUpperInvariant();
        var exists = await context.StockCounts.AnyAsync(x => x.Id != id && x.TenantId == tenantId.Value && x.CountNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status409Conflict, "A stock count with the same number already exists.");

        if (HasPostedWarehouseChange(stockCount, updateRequest.WarehouseId))
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "Warehouse cannot be changed after inventory movements have been posted.");

        if (IsCompletingWithoutActiveLines(stockCount, updateRequest.Status))
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "At least one active line is required before completing a stock count.");

        if (!CanTransition(stockCount.Status, updateRequest.Status))
            return ServiceResult<IEntityResponse<StockCount>>.Failure(StatusCodes.Status400BadRequest, "The requested stock count status transition is not allowed.");

        var previousStatus = stockCount.Status;
        updateRequest.Adapt(stockCount);
        stockCount.CountNumber = normalizedNumber;
        stockCount.Notes = NormalizeOptional(updateRequest.Notes);

        var movementResult = await inventoryMovementPostingService.ApplyStockCountStatusChangeAsync(stockCount, previousStatus, updateRequest.Status, cancellationToken);
        if (!movementResult.Succeeded)
            return ServiceResult<IEntityResponse<StockCount>>.Failure(
                movementResult.StatusCode ?? StatusCodes.Status400BadRequest,
                movementResult.ErrorMessage ?? "Unable to post stock count movements.",
                movementResult.ErrorCode);

        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<StockCount>>.Success(stockCount.Adapt<StockCountDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var stockCount = await context.StockCounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (stockCount is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Stock count not found.");

        if (stockCount.Status != DocumentStatus.Draft)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Stock counts can only be deleted while in Draft status.");

        context.StockCounts.Remove(stockCount);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    protected override IEntityResponse<StockCount> BuildEntityResponse(StockCount entity)
        => entity.Adapt<StockCountDetailsResponse>();

    protected override Task<StockCount> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<StockCount> input, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<StockCount>(null!);

    protected override Task<StockCount> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<StockCount>(null!);

    private static ServiceResult<StockCountDetailsResponse> MapResult(ServiceResult<IEntityResponse<StockCount>> result)
    {
        if (result.Succeeded)
            return ServiceResult<StockCountDetailsResponse>.Success(result.Value!.Adapt<StockCountDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<StockCountDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<StockCountDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? "An error occurred.");
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
            return true;

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
