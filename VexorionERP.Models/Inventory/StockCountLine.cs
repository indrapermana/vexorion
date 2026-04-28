using VexorionERP.Models;

namespace VexorionERP.Models;

public class StockCountLine : TenantEntityBase
{
    public Guid StockCountId { get; set; }
    public Guid ProductId { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal CountedQuantity { get; set; }
    public decimal VarianceQuantity => CountedQuantity - SystemQuantity;

    public StockCount? StockCount { get; set; }
    public Product? Product { get; set; }
}
