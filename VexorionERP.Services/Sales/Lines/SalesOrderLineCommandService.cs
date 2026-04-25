using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Lines;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesOrderLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesOrderLineCommandService
{
    public async Task<ServiceResult<SalesOrderLineDetailsResponse>> CreateAsync(Guid salesOrderId, CreateSalesOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(salesOrderId, request.ProductId, request.Quantity, request.UnitPrice, request.DiscountAmount);
        if (validation.Count > 0)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales order lines can only be modified while the order is in Draft status.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        var line = request.Adapt<SalesOrderLine>();
        line.TenantId = currentTenantProvider.TenantId ?? order.TenantId;
        line.SalesOrderId = salesOrderId;

        dbContext.SalesOrderLines.Add(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesOrderLineDetailsResponse>.Success(line.Adapt<SalesOrderLineDetailsResponse>());
    }

    public async Task<ServiceResult<SalesOrderLineDetailsResponse>> UpdateAsync(Guid salesOrderId, Guid salesOrderLineId, UpdateSalesOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(salesOrderId, request.ProductId, request.Quantity, request.UnitPrice, request.DiscountAmount);
        if (validation.Count > 0)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales order lines can only be modified while the order is in Draft status.");
        }

        var line = order.Lines.FirstOrDefault(x => x.Id == salesOrderLineId);
        if (line is null)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        request.Adapt(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesOrderLineDetailsResponse>.Success(line.Adapt<SalesOrderLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid salesOrderId, Guid salesOrderLineId, CancellationToken cancellationToken = default)
    {
        var order = await dbContext.SalesOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Sales order lines can only be modified while the order is in Draft status.");
        }

        var line = order.Lines.FirstOrDefault(x => x.Id == salesOrderLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales order line not found.");
        }

        dbContext.SalesOrderLines.Remove(line);
        order.TotalAmount = order.Lines.Where(x => x.Id != salesOrderLineId && x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid salesOrderId, Guid productId, decimal quantity, decimal unitPrice, decimal discountAmount)
    {
        var errors = new Dictionary<string, string[]>();
        if (salesOrderId == Guid.Empty) errors[nameof(CreateSalesOrderLineRequest)] = ["Sales order is required."];
        if (productId == Guid.Empty) errors[nameof(CreateSalesOrderLineRequest.ProductId)] = ["Product is required."];
        if (quantity <= 0) errors[nameof(CreateSalesOrderLineRequest.Quantity)] = ["Quantity must be greater than zero."];
        if (unitPrice < 0) errors[nameof(CreateSalesOrderLineRequest.UnitPrice)] = ["Unit price cannot be negative."];
        if (discountAmount < 0) errors[nameof(CreateSalesOrderLineRequest.DiscountAmount)] = ["Discount amount cannot be negative."];
        return errors;
    }
}