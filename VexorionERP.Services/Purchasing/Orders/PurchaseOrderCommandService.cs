using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Orders;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseOrderCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : IPurchaseOrderCommandService
{
    public async Task<ServiceResult<PurchaseOrderDetailsResponse>> CreateAsync(CreatePurchaseOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.OrderNumber, request.SupplierId, request.WarehouseId, request.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Suppliers.AnyAsync(x => x.Id == request.SupplierId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.OrderNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.PurchaseOrders.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A purchase order with the same number already exists.");
        }

        var order = request.Adapt<PurchaseOrder>();
        order.TenantId = currentTenantProvider.TenantId.Value;
        order.OrderNumber = request.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(request.Notes);
        order.TotalAmount = 0m;

        dbContext.PurchaseOrders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseOrderDetailsResponse>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseOrderDetailsResponse>> UpdateAsync(Guid purchaseOrderId, UpdatePurchaseOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.OrderNumber, request.SupplierId, request.WarehouseId, request.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (!await dbContext.Suppliers.AnyAsync(x => x.Id == request.SupplierId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.OrderNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.PurchaseOrders.AnyAsync(x => x.Id != purchaseOrderId && x.TenantId == currentTenantProvider.TenantId.Value && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A purchase order with the same number already exists.");
        }

        if (!CanTransition(order.Status, request.Status))
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "The requested purchase order status transition is not allowed.");
        }

        var previousStatus = order.Status;
        request.Adapt(order);
        order.OrderNumber = request.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(request.Notes);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);

        var inventoryResult = await inventoryMovementPostingService.ApplyPurchaseOrderStatusChangeAsync(order, previousStatus, request.Status, cancellationToken);
        if (!inventoryResult.Succeeded)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(inventoryResult.StatusCode ?? StatusCodes.Status400BadRequest, inventoryResult.ErrorMessage ?? "Unable to post purchase inventory movement.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseOrderDetailsResponse>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        var order = await dbContext.PurchaseOrders.FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        dbContext.PurchaseOrders.Remove(order);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
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

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}