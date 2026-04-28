using VexorionERP.Models;

namespace VexorionERP.Models;

public class StockTransferLine : TenantEntityBase
{
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }

    public StockTransfer? StockTransfer { get; set; }
    public Product? Product { get; set; }
}
