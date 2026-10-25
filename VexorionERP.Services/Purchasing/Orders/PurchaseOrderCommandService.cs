using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseOrderCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<PurchaseOrder>(currentTenantProvider)
{
    public async Task<ServiceResult<PurchaseOrderDetailsResponse>> CreateAsync(CreatePurchaseOrderRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<PurchaseOrder>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<PurchaseOrderDetailsResponse>> UpdateAsync(Guid purchaseOrderId, UpdatePurchaseOrderRequest request, CancellationToken cancellationToken = default)
    {
        var result = await UpdateAsync(purchaseOrderId, (IUpdateInput<PurchaseOrder>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default)
        => DeleteAsync(purchaseOrderId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<PurchaseOrder>>> CreateAsync(ICreateInput<PurchaseOrder> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var createRequest = (CreatePurchaseOrderRequest)request;

        var validation = Validate(createRequest.OrderNumber, createRequest.SupplierId, createRequest.WarehouseId, createRequest.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.ValidationFailure(validation);
        }

        if (!await context.Suppliers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == createRequest.SupplierId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == createRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = createRequest.OrderNumber.Trim().ToUpperInvariant();
        var exists = await context.PurchaseOrders.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status409Conflict, "A purchase order with the same number already exists.");
        }

        var order = createRequest.Adapt<PurchaseOrder>();
        order.TenantId = tenantId.Value;
        order.OrderNumber = createRequest.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = createRequest.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(createRequest.Notes);
        order.TotalAmount = 0m;

        context.PurchaseOrders.Add(order);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<PurchaseOrder>>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }

    public override async Task<ServiceResult<IEntityResponse<PurchaseOrder>>> UpdateAsync(Guid purchaseOrderId, IUpdateInput<PurchaseOrder> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var updateRequest = (UpdatePurchaseOrderRequest)request;

        var validation = Validate(updateRequest.OrderNumber, updateRequest.SupplierId, updateRequest.WarehouseId, updateRequest.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.ValidationFailure(validation);
        }

        var order = await context.PurchaseOrders.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (order.Status != DocumentStatus.Draft && HasHeaderChanges(order, updateRequest))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(
                StatusCodes.Status409Conflict,
                "Only draft purchase orders can be modified. Confirmed or fulfilled orders must remain immutable.");
        }

        if (!await context.Suppliers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.SupplierId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = updateRequest.OrderNumber.Trim().ToUpperInvariant();
        var exists = await context.PurchaseOrders.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != purchaseOrderId && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status409Conflict, "A purchase order with the same number already exists.");
        }

        if (!CanTransition(order.Status, updateRequest.Status))
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "The requested purchase order status transition is not allowed.");
        }

        var previousStatus = order.Status;
        updateRequest.Adapt(order);
        order.OrderNumber = updateRequest.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = updateRequest.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(updateRequest.Notes);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);

        var inventoryResult = await inventoryMovementPostingService.ApplyPurchaseOrderStatusChangeAsync(order, previousStatus, updateRequest.Status, cancellationToken);
        if (!inventoryResult.Succeeded)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(inventoryResult.StatusCode ?? StatusCodes.Status400BadRequest, inventoryResult.ErrorMessage ?? "Unable to post purchase inventory movement.");
        }

        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<PurchaseOrder>>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await context.PurchaseOrders.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status409Conflict,
                "Only draft purchase orders can be deleted. Confirmed or fulfilled orders must remain visible.");
        }

        context.PurchaseOrders.Remove(order);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    protected override IEntityResponse<PurchaseOrder> BuildEntityResponse(PurchaseOrder entity)
    {
        return entity.Adapt<PurchaseOrderDetailsResponse>();
    }

    protected override Task<PurchaseOrder> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<PurchaseOrder> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseOrder>(null!);
    }

    protected override Task<PurchaseOrder> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseOrder>(null!);
    }

    private static Dictionary<string, string[]> Validate(string orderNumber, Guid supplierId, Guid warehouseId, string currencyCode)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(orderNumber)) errors[nameof(CreatePurchaseOrderRequest.OrderNumber)] = ["Order number is required."];
        if (supplierId == Guid.Empty) errors[nameof(CreatePurchaseOrderRequest.SupplierId)] = ["Supplier is required."];
        if (warehouseId == Guid.Empty) errors[nameof(CreatePurchaseOrderRequest.WarehouseId)] = ["Warehouse is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreatePurchaseOrderRequest.CurrencyCode)] = ["Currency code is required."];
        return errors;
    }

    private static bool CanTransition(DocumentStatus previousStatus, DocumentStatus newStatus)
    {
        if (previousStatus == newStatus)
        {
            return true;
        }

        if (previousStatus is DocumentStatus.Completed or DocumentStatus.Cancelled)
        {
            return false;
        }

        return true;
    }

    private static bool HasHeaderChanges(PurchaseOrder order, UpdatePurchaseOrderRequest request) =>
        !string.Equals(order.OrderNumber, request.OrderNumber.Trim(), StringComparison.OrdinalIgnoreCase)
        || order.SupplierId != request.SupplierId
        || order.WarehouseId != request.WarehouseId
        || order.OrderDate != request.OrderDate
        || order.ExpectedReceiptDate != request.ExpectedReceiptDate
        || !string.Equals(order.CurrencyCode, request.CurrencyCode.Trim(), StringComparison.OrdinalIgnoreCase)
        || !string.Equals(NormalizeOptional(order.Notes), NormalizeOptional(request.Notes), StringComparison.Ordinal)
        || order.IsActive != request.IsActive;

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceResult<PurchaseOrderDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseOrder>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseOrderDetailsResponse>();
            return ServiceResult<PurchaseOrderDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseOrderDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
