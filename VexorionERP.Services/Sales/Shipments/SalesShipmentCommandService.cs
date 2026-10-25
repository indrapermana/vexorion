using Mapster;
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
    IInventoryMovementPostingService inventoryMovementPostingService) : BaseCommandService<SalesShipment>(currentTenantProvider), ISalesShipmentPostingService
{
    public async Task<ServiceResult<SalesShipmentDetailsResponse>> CreateAsync(CreateSalesShipmentRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<SalesShipment>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public Task<ServiceResult<bool>> DeleteAsync(Guid shipmentId, CancellationToken cancellationToken = default)
        => DeleteAsync(shipmentId, dbContext, cancellationToken);

    public override async Task<ServiceResult<IEntityResponse<SalesShipment>>> CreateAsync(ICreateInput<SalesShipment> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var createRequest = (CreateSalesShipmentRequest)request;

        if (string.IsNullOrWhiteSpace(createRequest.ShipmentNumber))
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.ValidationFailure(
                new Dictionary<string, string[]> { { nameof(createRequest.ShipmentNumber), ["Shipment number is required."] } });
        }

        if (createRequest.Lines is null || createRequest.Lines.Count == 0)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "At least one shipment line is required.");
        }

        var order = await context.SalesOrders.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == createRequest.SalesOrderId, cancellationToken);

        if (order is null)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Sales order not found.");
        }

        if (order.Status == DocumentStatus.Cancelled)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Cannot create a shipment for a cancelled sales order.");
        }

        if (order.Status == DocumentStatus.Completed)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Sales order is already fully shipped.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value).AnyAsync(x => x.Id == createRequest.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var normalizedNumber = createRequest.ShipmentNumber.Trim().ToUpperInvariant();
        var exists = await context.SalesShipments.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ShipmentNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status409Conflict, "A sales shipment with the same number already exists.");
        }

        // Validate over-shipment
        var orderLinesById = order.Lines.Where(x => x.IsActive).ToDictionary(x => x.Id);
        foreach (var lineRequest in createRequest.Lines)
        {
            if (lineRequest.ShippedQuantity <= 0)
            {
                return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, "Shipped quantity must be greater than zero.");
            }

            if (!orderLinesById.TryGetValue(lineRequest.SalesOrderLineId, out var orderLine))
            {
                return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest, $"Sales order line {lineRequest.SalesOrderLineId} not found.");
            }

            var newTotal = orderLine.ShippedQuantity + lineRequest.ShippedQuantity;
            if (newTotal > orderLine.Quantity)
            {
                return ServiceResult<IEntityResponse<SalesShipment>>.Failure(StatusCodes.Status400BadRequest,
                    $"Over-shipment not allowed. Order line allows {orderLine.Quantity - orderLine.ShippedQuantity} more units to be shipped.");
            }
        }

        var shipment = new SalesShipment
        {
            TenantId = tenantId.Value,
            ShipmentNumber = normalizedNumber,
            SalesOrderId = createRequest.SalesOrderId,
            WarehouseId = createRequest.WarehouseId,
            ShipmentDate = createRequest.ShipmentDate,
            Status = DocumentStatus.Draft,
            Notes = string.IsNullOrWhiteSpace(createRequest.Notes) ? null : createRequest.Notes.Trim(),
        };

        foreach (var lineRequest in createRequest.Lines)
        {
            shipment.Lines.Add(new SalesShipmentLine
            {
                TenantId = tenantId.Value,
                SalesOrderLineId = lineRequest.SalesOrderLineId,
                ProductId = lineRequest.ProductId,
                ShippedQuantity = lineRequest.ShippedQuantity,
                UnitPrice = lineRequest.UnitPrice,
            });
        }

        context.SalesShipments.Add(shipment);
        await context.SaveChangesAsync(cancellationToken);

        var response = await BuildDetailsResponseAsync(shipment.Id, cancellationToken);
        return ServiceResult<IEntityResponse<SalesShipment>>.Success(response!);
    }

    public async Task<ServiceResult<SalesShipmentDetailsResponse>> PostAsync(Guid shipmentId, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var shipment = await dbContext.SalesShipments.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales shipment not found.");
        }

        if (shipment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "Only draft shipments can be posted.");
        }

        var order = await dbContext.SalesOrders.GetByTenant(tenantId.Value)
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
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(
                movementResult.StatusCode ?? 500,
                movementResult.ErrorMessage!,
                movementResult.ErrorCode);
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

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(
                StatusCodes.Status409Conflict,
                "The sales order fulfillment changed while this shipment was being posted. Reload the order and try again.");
        }

        var response = await BuildDetailsResponseAsync(shipment.Id, cancellationToken);
        return ServiceResult<SalesShipmentDetailsResponse>.Success(response!);
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid shipmentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var shipment = await context.SalesShipments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales shipment not found.");
        }

        if (shipment.Status != DocumentStatus.Draft)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status409Conflict, "Only draft shipments can be deleted.");
        }

        shipment.IsActive = false;
        await context.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    protected override Task<SalesShipment> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<SalesShipment> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesShipment>(null!);
    }

    protected override Task<SalesShipment> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<SalesShipment>(null!);
    }

    protected override IEntityResponse<SalesShipment> BuildEntityResponse(SalesShipment entity)
    {
        return entity.Adapt<SalesShipmentDetailsResponse>();
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

    private static ServiceResult<SalesShipmentDetailsResponse> MapResult(ServiceResult<IEntityResponse<SalesShipment>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<SalesShipmentDetailsResponse>();
            return ServiceResult<SalesShipmentDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<SalesShipmentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
