using VexorionERP.Models;

namespace VexorionERP.Models;

public class SalesOrderLine : TenantEntityBase
{
    public Guid SalesOrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippedQuantity { get; set; }
    public decimal RemainingQuantity => Quantity - ShippedQuantity;
    public decimal LineTotal => (Quantity * UnitPrice) - DiscountAmount;

    public SalesOrder? SalesOrder { get; set; }
    public Product? Product { get; set; }
    public ICollection<SalesShipmentLine> ShipmentLines { get; set; } = [];
}
