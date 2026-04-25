using VexorionERP.Models.Common;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;

namespace VexorionERP.Models.Catalog;

public class Product : TenantEntityBase
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string UnitOfMeasure { get; set; } = "EA";
    public decimal StandardCost { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }

    public ICollection<InventoryBalance> InventoryBalances { get; set; } = [];
    public ICollection<InventoryAdjustmentLine> InventoryAdjustmentLines { get; set; } = [];
    public ICollection<StockTransferLine> StockTransferLines { get; set; } = [];
    public ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = [];
    public ICollection<SalesOrderLine> SalesOrderLines { get; set; } = [];
}