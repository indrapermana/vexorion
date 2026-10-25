using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseReceiptCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<PurchaseReceipt>(currentTenantProvider), IPurchaseReceiptPostingService
{
    public async Task<ServiceResult<PurchaseReceiptDetailsResponse>> CreateAsync(CreatePurchaseReceiptRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<PurchaseReceipt>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid receiptId, CancellationToken cancellationToken = default)
        => DeleteAsync(receiptId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<PurchaseReceipt>>> CreateAsync(ICreateInput<PurchaseReceipt> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var createRequest = (CreatePurchaseReceiptRequest)request;

        if (string.IsNullOrWhiteSpace(createRequest.ReceiptNumber))
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.ValidationFailure(
                new Dictionary<string, string[]> { { nameof(createRequest.ReceiptNumber), ["Receipt number is required."] } });
        }

        if (createRequest.Lines is null || createRequest.Lines.Count == 0)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "At least one receipt line is required.");
        }

        var order = await context.PurchaseOrders.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == createRequest.PurchaseOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Purchase order not found.");
        }

        if (order.Status == DocumentStatus.Cancelled)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Cannot create a receipt for a cancelled purchase order.");
        }

        if (order.Status == DocumentStatus.Completed)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Purchase order is already fully received.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value).AnyAsync(x => x.Id == createRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = createRequest.ReceiptNumber.Trim().ToUpperInvariant();
        var exists = await context.PurchaseReceipts.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ReceiptNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status409Conflict, "A purchase receipt with the same number already exists.");
        }

        // Validate over-receipt
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var lineRequest in createRequest.Lines)
        {
            if (lineRequest.ReceivedQuantity <= 0)
            {
                return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, "Received quantity must be greater than zero.");
            }

            if (!orderLinesById.TryGetValue(lineRequest.PurchaseOrderLineId, out var orderLine))
            {
                return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest, $"Purchase order line {lineRequest.PurchaseOrderLineId} not found.");
            }

            var newTotal = orderLine.ReceivedQuantity + lineRequest.ReceivedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<IEntityResponse<PurchaseReceipt>>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-receipt not allowed. Order line allows {orderLine.Quantity - orderLine.ReceivedQuantity} more units to be received.");
            }
        }

        var receipt = new PurchaseReceipt
        {
            TenantId = tenantId.Value,
            ReceiptNumber = normalizedNumber,
            PurchaseOrderId = createRequest.PurchaseOrderId,
            WarehouseId = createRequest.WarehouseId,
            ReceiptDate = createRequest.ReceiptDate,
            Status = DocumentStatus.Draft,
            Notes = string.IsNullOrWhiteSpace(createRequest.Notes) ? null : createRequest.Notes.Trim(),
        };

        foreach (var lineRequest in createRequest.Lines)
        {
            receipt.Lines.Add(new PurchaseReceiptLine
            {
                TenantId = tenantId.Value,
                PurchaseOrderLineId = lineRequest.PurchaseOrderLineId,
                ProductId = lineRequest.ProductId,
                ReceivedQuantity = lineRequest.ReceivedQuantity,
                UnitCost = lineRequest.UnitCost,
            });
        }

        context.PurchaseReceipts.Add(receipt);
        await context.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(receipt.Id, cancellationToken);
        return ServiceResult<IEntityResponse<PurchaseReceipt>>.Success(response!);
    }

    public async Task<ServiceResult<PurchaseReceiptDetailsResponse>> PostAsync(Guid receiptId, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var receipt = await dbContext.PurchaseReceipts.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase receipt not found.");
        }

        if (receipt.Status != DocumentStatus.Draft)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status409Conflict, "Only draft receipts can be posted.");
        }

        var order = await dbContext.PurchaseOrders.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == receipt.PurchaseOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Associated purchase order not found.");
        }

        // Re-validate over-receipt at post time (guards against race conditions)
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var line in receipt.Lines.Where(x => x.IsActive))
        {
            if (!orderLinesById.TryGetValue(line.PurchaseOrderLineId, out var orderLine))
            {
                return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Purchase order line not found.");
            }

            var newTotal = orderLine.ReceivedQuantity + line.ReceivedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-receipt not allowed for order line {orderLine.Id}.");
            }
        }

        var movementResult = await inventoryMovementPostingService.ApplyPurchaseReceiptAsync(receipt, order.OrderNumber, cancellationToken);
        if (!movementResult.Succeeded)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(movementResult.StatusCode ?? 500, movementResult.ErrorMessage!);
        }

        // Update received quantities on order lines
        foreach (var receiptLine in receipt.Lines.Where(x => x.IsActive))
        {
            if (orderLinesById.TryGetValue(receiptLine.PurchaseOrderLineId, out var orderLine))
            {
                orderLine.ReceivedQuantity += receiptLine.ReceivedQuantity;
            }
        }

        // Update order status
        var allReceived = order.Lines.Where(x => x.IsActive).All(x => x.ReceivedQuantity >= x.Quantity);
        var anyReceived = order.Lines.Where(x => x.IsActive).Any(x => x.ReceivedQuantity > 0);

        if (allReceived)
        {
            order.Status = DocumentStatus.Completed;
        }
        else if (anyReceived)
        {
            order.Status = DocumentStatus.PartiallyProcessed;
        }

        receipt.Status = DocumentStatus.Completed;
        receipt.PostedAtUtc = DateTimeOffset.UtcNow;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(
                StatusCodes.Status409Conflict,
                "The purchase order fulfillment changed while this receipt was being posted. Reload the order and try again.");
        }

        var response = await BuildDetailsResponseAsync(receipt.Id, cancellationToken);
        return ServiceResult<PurchaseReceiptDetailsResponse>.Success(response!);
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid receiptId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var receipt = await context.PurchaseReceipts.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase receipt not found.");
        }

        if (receipt.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status409Conflict, "Only draft receipts can be deleted.");
        }

        receipt.IsActive = false;
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    protected override Task<PurchaseReceipt> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<PurchaseReceipt> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseReceipt>(null!);
    }

    protected override Task<PurchaseReceipt> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<PurchaseReceipt>(null!);
    }

    protected override IEntityResponse<PurchaseReceipt> BuildEntityResponse(PurchaseReceipt entity)
    {
        return entity.Adapt<PurchaseReceiptDetailsResponse>();
    }

    private async Task<PurchaseReceiptDetailsResponse?> BuildDetailsResponseAsync(Guid receiptId, CancellationToken cancellationToken)
    {
        var receipt = await dbContext.PurchaseReceipts
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.PurchaseOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null) return null;

        return new PurchaseReceiptDetailsResponse
        {
            Id = receipt.Id,
            ReceiptNumber = receipt.ReceiptNumber,
            PurchaseOrderId = receipt.PurchaseOrderId,
            PurchaseOrderNumber = receipt.PurchaseOrder?.OrderNumber ?? string.Empty,
            WarehouseId = receipt.WarehouseId,
            WarehouseName = receipt.Warehouse?.Name ?? string.Empty,
            ReceiptDate = receipt.ReceiptDate,
            Status = receipt.Status,
            Notes = receipt.Notes,
            PostedAtUtc = receipt.PostedAtUtc,
            Lines = receipt.Lines.Where(x => x.IsActive).Select(l => new PurchaseReceiptLineResponse
            {
                Id = l.Id,
                PurchaseOrderLineId = l.PurchaseOrderLineId,
                ProductId = l.ProductId,
                ProductName = l.Product?.Name ?? string.Empty,
                ReceivedQuantity = l.ReceivedQuantity,
                UnitCost = l.UnitCost,
                LineTotal = l.ReceivedQuantity * l.UnitCost,
            }).ToList(),
        };
    }

    private static ServiceResult<PurchaseReceiptDetailsResponse> MapResult(ServiceResult<IEntityResponse<PurchaseReceipt>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<PurchaseReceiptDetailsResponse>();
            return ServiceResult<PurchaseReceiptDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
