using VexorionERP.Models.Common;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;

namespace VexorionERP.Models.Inventory;

public class Warehouse : TenantEntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LocationDescription { get; set; }

    public ICollection<InventoryBalance> InventoryBalances { get; set; } = [];
    public ICollection<InventoryMovement> InventoryMovements { get; set; } = [];
    public ICollection<InventoryAdjustment> InventoryAdjustments { get; set; } = [];
    public ICollection<StockTransfer> SourceStockTransfers { get; set; } = [];
    public ICollection<StockTransfer> DestinationStockTransfers { get; set; } = [];
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
    public ICollection<SalesOrder> SalesOrders { get; set; } = [];
}