namespace VexorionERP.Contracts.Sales.Shipments;

public class CreateSalesShipmentRequest
{
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid SalesOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly ShipmentDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateSalesShipmentLineRequest> Lines { get; set; } = [];
}
