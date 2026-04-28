using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesShipmentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IInventoryMovementPostingService inventoryMovementPostingService) : ISalesShipmentCommandService
{
    public async Task<ServiceResult<SalesShipmentDetailsResponse>> CreateAsync(CreateSalesShipmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var tenantId = currentTenantProvider.TenantId.Value;

        if (string.IsNullOrWhiteSpace(request.ShipmentNumber))
        {
            return ServiceResult<SalesShipmentDetailsResponse>.ValidationFailure(
                new Dictionary<string, string[]> { { nameof(request.ShipmentNumber), ["Shipment number is required."] } });
        }

        if (request.Lines is null || request.Lines.Count == 0)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "At least one shipment line is required.");
        }

        var order = await dbContext.SalesOrders
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == request.SalesOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales order not found.");
        }

        if (order.Status == DocumentStatus.Cancelled)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Cannot create a shipment for a cancelled sales order.");
        }

        if (order.Status == DocumentStatus.Completed)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales order is already fully shipped.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = request.ShipmentNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.SalesShipments.AnyAsync(
            x => x.TenantId == tenantId && x.ShipmentNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A sales shipment with the same number already exists.");
        }

        // Validate over-shipment
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var lineRequest in request.Lines)
        {
            if (lineRequest.ShippedQuantity <= 0)
            {
                return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Shipped quantity must be greater than zero.");
            }

            if (!orderLinesById.TryGetValue(lineRequest.SalesOrderLineId, out var orderLine))
            {
                return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, $"Sales order line {lineRequest.SalesOrderLineId} not found.");
            }

            var newTotal = orderLine.ShippedQuantity + lineRequest.ShippedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-shipment not allowed. Order line allows {orderLine.Quantity - orderLine.ShippedQuantity} more units to be shipped.");
            }
        }

        var shipment = new SalesShipment
        {
            TenantId = tenantId,
            ShipmentNumber = normalizedNumber,
            SalesOrderId = request.SalesOrderId,
            WarehouseId = request.WarehouseId,
            ShipmentDate = request.ShipmentDate,
            Status = DocumentStatus.Draft,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        foreach (var lineRequest in request.Lines)
        {
            shipment.Lines.Add(new SalesShipmentLine
            {
                TenantId = tenantId,
                SalesOrderLineId = lineRequest.SalesOrderLineId,
                ProductId = lineRequest.ProductId,
                ShippedQuantity = lineRequest.ShippedQuantity,
                UnitPrice = lineRequest.UnitPrice,
            });
        }

        dbContext.SalesShipments.Add(shipment);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(shipment.Id, cancellationToken);
        return ServiceResult<SalesShipmentDetailsResponse>.Success(response!);
    }

    public async Task<ServiceResult<SalesShipmentDetailsResponse>> PostAsync(Guid shipmentId, CancellationToken cancellationToken = default)
    {
        var shipment = await dbContext.SalesShipments
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales shipment not found.");
        }

        if (shipment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Only draft shipments can be posted.");
        }

        var order = await dbContext.SalesOrders
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == shipment.SalesOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Associated sales order not found.");
        }

        // Re-validate over-shipment at post time
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var line in shipment.Lines.Where(x => x.IsActive))
        {
            if (!orderLinesById.TryGetValue(line.SalesOrderLineId, out var orderLine))
            {
                return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales order line not found.");
            }

            var newTotal = orderLine.ShippedQuantity + line.ShippedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-shipment not allowed for order line {orderLine.Id}.");
            }
        }

        var movementResult = await inventoryMovementPostingService.ApplySalesShipmentAsync(shipment, order.OrderNumber, cancellationToken);
        if (!movementResult.Succeeded)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(movementResult.StatusCode ?? 500, movementResult.ErrorMessage!);
        }

        // Update shipped quantities on order lines
        foreach (var shipmentLine in shipment.Lines.Where(x => x.IsActive))
        {
            if (orderLinesById.TryGetValue(shipmentLine.SalesOrderLineId, out var orderLine))
            {
                orderLine.ShippedQuantity += shipmentLine.ShippedQuantity;
            }
        }

        // Update order status
        var allShipped = order.Lines.Where(x => x.IsActive).All(x => x.ShippedQuantity >= x.Quantity);
        var anyShipped = order.Lines.Where(x => x.IsActive).Any(x => x.ShippedQuantity > 0);

        if (allShipped)
        {
            order.Status = DocumentStatus.Completed;
        }
        else if (anyShipped)
        {
            order.Status = DocumentStatus.PartiallyProcessed;
        }

        shipment.Status = DocumentStatus.Completed;
        shipment.PostedAtUtc = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(shipment.Id, cancellationToken);
        return ServiceResult<SalesShipmentDetailsResponse>.Success(response!);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid shipmentId, CancellationToken cancellationToken = default)
    {
        var shipment = await dbContext.SalesShipments
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales shipment not found.");
        }

        if (shipment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft shipments can be deleted.");
        }

        shipment.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private async Task<SalesShipmentDetailsResponse?> BuildDetailsResponseAsync(Guid shipmentId, CancellationToken cancellationToken)
    {
        var shipment = await dbContext.SalesShipments
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.SalesOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null) return null;

        return new SalesShipmentDetailsResponse
        {
            Id = shipment.Id,
            ShipmentNumber = shipment.ShipmentNumber,
            SalesOrderId = shipment.SalesOrderId,
            SalesOrderNumber = shipment.SalesOrder?.OrderNumber ?? string.Empty,
            WarehouseId = shipment.WarehouseId,
            WarehouseName = shipment.Warehouse?.Name ?? string.Empty,
            ShipmentDate = shipment.ShipmentDate,
            Status = shipment.Status,
            Notes = shipment.Notes,
            PostedAtUtc = shipment.PostedAtUtc,
            Lines = shipment.Lines.Where(x => x.IsActive).Select(l => new SalesShipmentLineResponse
            {
                Id = l.Id,
                SalesOrderLineId = l.SalesOrderLineId,
                ProductId = l.ProductId,
                ProductName = l.Product?.Name ?? string.Empty,
                ShippedQuantity = l.ShippedQuantity,
                UnitPrice = l.UnitPrice,
                LineTotal = l.ShippedQuantity * l.UnitPrice,
            }).ToList(),
        };
    }
}
