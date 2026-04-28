using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesOrderCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<SalesOrder>(currentTenantProvider)
{
    public async Task<ServiceResult<SalesOrderDetailsResponse>> CreateAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<SalesOrder>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public async Task<ServiceResult<SalesOrderDetailsResponse>> UpdateAsync(Guid salesOrderId, UpdateSalesOrderRequest request, CancellationToken cancellationToken = default)
    {
        var result = await UpdateAsync(salesOrderId, (IUpdateInput<SalesOrder>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, CancellationToken cancellationToken = default)
        => DeleteAsync(salesOrderId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<SalesOrder>>> CreateAsync(ICreateInput<SalesOrder> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var createRequest = (CreateSalesOrderRequest)request;

        var validation = Validate(createRequest.OrderNumber, createRequest.CustomerId, createRequest.WarehouseId, createRequest.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.ValidationFailure(validation);
        }

        if (!await context.Customers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == createRequest.CustomerId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == createRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = createRequest.OrderNumber.Trim().ToUpperInvariant();
        var exists = await context.SalesOrders.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status409Conflict, "A sales order with the same number already exists.");
        }

        var order = createRequest.Adapt<SalesOrder>();
        order.TenantId = tenantId.Value;
        order.OrderNumber = createRequest.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = createRequest.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(createRequest.Notes);
        order.TotalAmount = 0m;

        context.SalesOrders.Add(order);
        await context.SaveChangesAsync(cancellationToken);

        return ServiceResult<IEntityResponse<SalesOrder>>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }

    public override async Task<ServiceResult<IEntityResponse<SalesOrder>>> UpdateAsync(Guid salesOrderId, IUpdateInput<SalesOrder> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var updateRequest = (UpdateSalesOrderRequest)request;

        var validation = Validate(updateRequest.OrderNumber, updateRequest.CustomerId, updateRequest.WarehouseId, updateRequest.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.ValidationFailure(validation);
        }

        var order = await context.SalesOrders.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        if (!await context.Customers.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.CustomerId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == updateRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = updateRequest.OrderNumber.Trim().ToUpperInvariant();
        var exists = await context.SalesOrders.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != salesOrderId && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status409Conflict, "A sales order with the same number already exists.");
        }

        if (!CanTransition(order.Status, updateRequest.Status))
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "The requested sales order status transition is not allowed.");
        }

        var previousStatus = order.Status;
        updateRequest.Adapt(order);
        order.OrderNumber = updateRequest.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = updateRequest.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(updateRequest.Notes);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);

        var inventoryResult = await inventoryMovementPostingService.ApplySalesOrderStatusChangeAsync(order, previousStatus, updateRequest.Status, cancellationToken);
        if (!inventoryResult.Succeeded)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(inventoryResult.StatusCode ?? StatusCodes.Status400BadRequest, inventoryResult.ErrorMessage ?? "Unable to post sales inventory movement.");
        }

        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<IEntityResponse<SalesOrder>>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await context.SalesOrders.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        context.SalesOrders.Remove(order);
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    protected override IEntityResponse<SalesOrder> BuildEntityResponse(SalesOrder entity)
    {
        return entity.Adapt<SalesOrderDetailsResponse>();
    }

    protected override Task<SalesOrder> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<SalesOrder> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesOrder>(null!);
    }

    protected override Task<SalesOrder> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesOrder>(null!);
    }

    private static Dictionary<string, string[]> Validate(string orderNumber, Guid customerId, Guid warehouseId, string currencyCode)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(orderNumber)) errors[nameof(CreateSalesOrderRequest.OrderNumber)] = ["Order number is required."];
        if (customerId == Guid.Empty) errors[nameof(CreateSalesOrderRequest.CustomerId)] = ["Customer is required."];
        if (warehouseId == Guid.Empty) errors[nameof(CreateSalesOrderRequest.WarehouseId)] = ["Warehouse is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreateSalesOrderRequest.CurrencyCode)] = ["Currency code is required."];
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

    private static ServiceResult<SalesOrderDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesOrder>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesOrderDetailsResponse>();
            return ServiceResult<SalesOrderDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesOrderDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesOrderDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
