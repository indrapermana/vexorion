using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Orders;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesOrderCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesOrderCommandService
{
    public async Task<ServiceResult<SalesOrderDetailsResponse>> CreateAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.OrderNumber, request.CustomerId, request.WarehouseId, request.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<SalesOrderDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.OrderNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.SalesOrders.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A sales order with the same number already exists.");
        }

        var order = request.Adapt<SalesOrder>();
        order.TenantId = currentTenantProvider.TenantId.Value;
        order.OrderNumber = request.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(request.Notes);
        order.TotalAmount = 0m;

        dbContext.SalesOrders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<SalesOrderDetailsResponse>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }

    public async Task<ServiceResult<SalesOrderDetailsResponse>> UpdateAsync(Guid salesOrderId, UpdateSalesOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.OrderNumber, request.CustomerId, request.WarehouseId, request.CurrencyCode);
        if (validation.Count > 0)
        {
            return ServiceResult<SalesOrderDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        if (!await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.OrderNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.SalesOrders.AnyAsync(x => x.Id != salesOrderId && x.TenantId == currentTenantProvider.TenantId.Value && x.OrderNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A sales order with the same number already exists.");
        }

        request.Adapt(order);
        order.OrderNumber = request.OrderNumber.Trim().ToUpperInvariant();
        order.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        order.Notes = NormalizeOptional(request.Notes);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesOrderDetailsResponse>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, CancellationToken cancellationToken = default)
    {
        var order = await dbContext.SalesOrders.FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        dbContext.SalesOrders.Remove(order);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
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

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}