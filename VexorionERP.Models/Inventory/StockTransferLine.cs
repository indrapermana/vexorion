using VexorionERP.Models.Catalog;
using VexorionERP.Models.Common;

namespace VexorionERP.Models.Inventory;

public class StockTransferLine : TenantEntityBase
{
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }

    public StockTransfer? StockTransfer { get; set; }
    public Product? Product { get; set; }
}