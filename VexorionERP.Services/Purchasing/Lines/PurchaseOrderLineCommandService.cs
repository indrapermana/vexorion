using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseOrderLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseLineCommandService<PurchaseOrder, PurchaseOrderLine, CreatePurchaseOrderLineRequest, UpdatePurchaseOrderLineRequest>
{
    protected override async Task<ServiceResult<ILineResponse<PurchaseOrderLine>>> CreateAsync(Guid purchaseOrderId, CreatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(purchaseOrderId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.ValidationFailure(validation);
        }

        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status409Conflict, "Purchase order lines can only be modified while the order is in Draft status.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        var line = request.Adapt<PurchaseOrderLine>();
        line.TenantId = currentTenantProvider.TenantId ?? order.TenantId;
        line.PurchaseOrderId = purchaseOrderId;

        dbContext.PurchaseOrderLines.Add(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<ILineResponse<PurchaseOrderLine>>.Success(line.Adapt<PurchaseOrderLineDetailsResponse>());
    }

    protected override async Task<ServiceResult<ILineResponse<PurchaseOrderLine>>> UpdateAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, UpdatePurchaseOrderLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(purchaseOrderId, request.ProductId, request.Quantity, request.UnitCost);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.ValidationFailure(validation);
        }

        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status409Conflict, "Purchase order lines can only be modified while the order is in Draft status.");
        }

        var line = order.Lines.FirstOrDefault(x => x.Id == purchaseOrderLineId);
        if (line is null)
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status404NotFound, "Purchase order line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<ILineResponse<PurchaseOrderLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        request.Adapt(line);
        order.TotalAmount = order.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitCost);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<ILineResponse<PurchaseOrderLine>>.Success(line.Adapt<PurchaseOrderLineDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, CancellationToken cancellationToken = default)
    {
        var order = await dbContext.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        if (order is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.");
        }

        if (order.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status409Conflict, "Purchase order lines can only be modified while the order is in Draft status.");
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
