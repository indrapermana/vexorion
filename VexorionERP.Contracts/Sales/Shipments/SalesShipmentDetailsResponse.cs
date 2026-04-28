using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class SalesShipmentDetailsResponse
{
    public Guid Id { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid SalesOrderId { get; set; }
    public string SalesOrderNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public DateOnly ShipmentDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset? PostedAtUtc { get; set; }
    public List<SalesShipmentLineResponse> Lines { get; set; } = [];
}
