using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Receipts;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseReceiptCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : IPurchaseReceiptCommandService
{
    public async Task<ServiceResult<PurchaseReceiptDetailsResponse>> CreateAsync(CreatePurchaseReceiptRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var tenantId = currentTenantProvider.TenantId.Value;

        if (string.IsNullOrWhiteSpace(request.ReceiptNumber))
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.ValidationFailure(
                new Dictionary<string, string[]> { { nameof(request.ReceiptNumber), ["Receipt number is required."] } });
        }

        if (request.Lines is null || request.Lines.Count == 0)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "At least one receipt line is required.");
        }

        var order = await dbContext.PurchaseOrders
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == request.PurchaseOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Purchase order not found.");
        }

        if (order.Status == DocumentStatus.Cancelled)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Cannot create a receipt for a cancelled purchase order.");
        }

        if (order.Status == DocumentStatus.Completed)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Purchase order is already fully received.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.ReceiptNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.PurchaseReceipts.AnyAsync(
            x => x.TenantId == tenantId && x.ReceiptNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A purchase receipt with the same number already exists.");
        }

        // Validate over-receipt
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var lineRequest in request.Lines)
        {
            if (lineRequest.ReceivedQuantity <= 0)
            {
                return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Received quantity must be greater than zero.");
            }

            if (!orderLinesById.TryGetValue(lineRequest.PurchaseOrderLineId, out var orderLine))
            {
                return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, $"Purchase order line {lineRequest.PurchaseOrderLineId} not found.");
            }

            var newTotal = orderLine.ReceivedQuantity + lineRequest.ReceivedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-receipt not allowed. Order line allows {orderLine.Quantity - orderLine.ReceivedQuantity} more units to be received.");
            }
        }

        var receipt = new PurchaseReceipt
        {
            TenantId = tenantId,
            ReceiptNumber = normalizedNumber,
            PurchaseOrderId = request.PurchaseOrderId,
            WarehouseId = request.WarehouseId,
            ReceiptDate = request.ReceiptDate,
            Status = DocumentStatus.Draft,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        foreach (var lineRequest in request.Lines)
        {
            receipt.Lines.Add(new PurchaseReceiptLine
            {
                TenantId = tenantId,
                PurchaseOrderLineId = lineRequest.PurchaseOrderLineId,
                ProductId = lineRequest.ProductId,
                ReceivedQuantity = lineRequest.ReceivedQuantity,
                UnitCost = lineRequest.UnitCost,
            });
        }

        dbContext.PurchaseReceipts.Add(receipt);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(receipt.Id, cancellationToken);
        return ServiceResult<PurchaseReceiptDetailsResponse>.Success(response!);
    }

    public async Task<ServiceResult<PurchaseReceiptDetailsResponse>> PostAsync(Guid receiptId, CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.PurchaseReceipts
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase receipt not found.");
        }

        if (receipt.Status != DocumentStatus.Draft)
        {
            return ServiceResult<PurchaseReceiptDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Only draft receipts can be posted.");
        }

        var order = await dbContext.PurchaseOrders
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

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(receipt.Id, cancellationToken);
        return ServiceResult<PurchaseReceiptDetailsResponse>.Success(response!);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid receiptId, CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.PurchaseReceipts
            .FirstOrDefaultAsync(x => x.Id == receiptId, cancellationToken);

        if (receipt is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase receipt not found.");
        }

        if (receipt.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft receipts can be deleted.");
        }

        receipt.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
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
}
