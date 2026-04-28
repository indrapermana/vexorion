using VexorionERP.Models;

namespace VexorionERP.Models;

public class SalesShipmentLine : TenantEntityBase
{
    public Guid SalesShipmentId { get; set; }
    public Guid SalesOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ShippedQuantity { get; set; }
    public decimal UnitPrice { get; set; }

    public SalesShipment? SalesShipment { get; set; }
    public SalesOrderLine? SalesOrderLine { get; set; }
    public Product? Product { get; set; }
}
