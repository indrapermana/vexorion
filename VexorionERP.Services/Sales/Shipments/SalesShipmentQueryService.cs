using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Shipments;
using VexorionERP.Database;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesShipmentQueryService(AppDbContext dbContext) : ISalesShipmentQueryService
{
    public async Task<ServiceResult<List<SalesShipmentListItemResponse>>> GetAllForOrderAsync(Guid salesOrderId, CancellationToken cancellationToken = default)
    {
        var shipments = await dbContext.SalesShipments
            .Include(x => x.Warehouse)
            .Where(x => x.SalesOrderId == salesOrderId)
            .OrderByDescending(x => x.ShipmentDate)
            .Select(x => new SalesShipmentListItemResponse
            {
                Id = x.Id,
                ShipmentNumber = x.ShipmentNumber,
                SalesOrderId = x.SalesOrderId,
                WarehouseId = x.WarehouseId,
                WarehouseName = x.Warehouse!.Name,
                ShipmentDate = x.ShipmentDate,
                Status = x.Status,
                PostedAtUtc = x.PostedAtUtc,
                LineCount = x.Lines.Count(l => l.IsActive),
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<List<SalesShipmentListItemResponse>>.Success(shipments);
    }

    public async Task<ServiceResult<SalesShipmentDetailsResponse>> GetByIdAsync(Guid shipmentId, CancellationToken cancellationToken = default)
    {
        var shipment = await dbContext.SalesShipments
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.SalesOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return ServiceResult<SalesShipmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales shipment not found.");
        }

        return ServiceResult<SalesShipmentDetailsResponse>.Success(new SalesShipmentDetailsResponse
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
        });
    }
}
