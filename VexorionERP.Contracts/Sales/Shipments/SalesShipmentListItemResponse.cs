using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class SalesShipmentListItemResponse
{
    public Guid Id { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid SalesOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public DateOnly ShipmentDate { get; set; }
    public DocumentStatus Status { get; set; }
    public DateTimeOffset? PostedAtUtc { get; set; }
    public int LineCount { get; set; }
}
