using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;

namespace VexorionERP.Models.Sales;

public class SalesShipment : TenantEntityBase
{
    public string ShipmentNumber { get; set; } = string.Empty;
    public Guid SalesOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly ShipmentDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string? Notes { get; set; }

    public SalesOrder? SalesOrder { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<SalesShipmentLine> Lines { get; set; } = [];
}
