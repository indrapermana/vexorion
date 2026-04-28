using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesShipmentQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseChildQueryService<SalesOrder, SalesShipment>(currentTenantProvider)
{
    protected override async Task<IReadOnlyCollection<IEntityListResponse<SalesShipment>>> GetAllForParentCoreAsync(Guid salesOrderId, AppDbContext context, CancellationToken cancellationToken)
    {
        var shipments = await context.SalesShipments
            .GetByTenant(TenantId)
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

        return shipments;
    }

    protected override async Task<IEntityResponse<SalesShipment>?> GetByIdCoreAsync(Guid shipmentId, AppDbContext context, CancellationToken cancellationToken)
    {
        var shipment = await context.SalesShipments
            .GetByTenant(TenantId)
            .Include(x => x.Lines).ThenInclude(x => x.Product)
            .Include(x => x.SalesOrder)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, cancellationToken);

        if (shipment is null)
        {
            return null;
        }

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
