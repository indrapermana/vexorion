using VexorionERP.Models;

namespace VexorionERP.Models;

public class InventoryBalance : TenantEntityBase
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal QuantityAvailable => QuantityOnHand - QuantityReserved;

    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
}
