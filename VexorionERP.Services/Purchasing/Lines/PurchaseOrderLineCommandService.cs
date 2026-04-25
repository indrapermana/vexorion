using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Lines;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseOrderLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseOrderLineCommandService
{
    public async Task<ServiceResult<PurchaseOrderLineDetailsResponse>> CreateAsync(Guid purchaseOrderId, CreatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(purchaseOrderId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        var line = request.Adapt<PurchaseOrderLine>();
        line.TenantId = currentTenantProvider.TenantId ?? order.TenantId;
        line.PurchaseOrderId = purchaseOrderId;

        dbContext.PurchaseOrderLines.Add(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseOrderLineDetailsResponse>.Success(line.Adapt<PurchaseOrderLineDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseOrderLineDetailsResponse>> UpdateAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, UpdatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(purchaseOrderId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.ValidationFailure(validation);
        }

        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        var line = order.Lines.FirstOrDefault(x => x.Id == purchaseOrderLineId);
        if (line is null)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        request.Adapt(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseOrderLineDetailsResponse>.Success(line.Adapt<PurchaseOrderLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, CancellationToken cancellationToken = default)
    {
        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        var line = order.Lines.FirstOrDefault(x => x.Id == purchaseOrderLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase order line not found.");
        }

        dbContext.PurchaseOrderLines.Remove(line);
        order.TotalAmount = order.Lines.Where(x => x.Id != purchaseOrderLineId && x.IsActive).Sum(x => x.Quantity * x.UnitCost);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid purchaseOrderId, Guid productId, decimal quantity, decimal unitCost)
    {
        var errors = new Dictionary<string, string[]>();
        if (purchaseOrderId == Guid.Empty) errors[nameof(CreatePurchaseOrderLineRequest)] = ["Purchase order is required."];
        if (productId == Guid.Empty) errors[nameof(CreatePurchaseOrderLineRequest.ProductId)] = ["Product is required."];
        if (quantity <= 0) errors[nameof(CreatePurchaseOrderLineRequest.Quantity)] = ["Quantity must be greater than zero."];
        if (unitCost < 0) errors[nameof(CreatePurchaseOrderLineRequest.UnitCost)] = ["Unit cost cannot be negative."];
        return errors;
    }
}