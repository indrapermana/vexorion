using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProductListItemResponse : IEntityListResponse<Product>
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal StandardCost { get; set; }
    public decimal PurchasePrice => StandardCost;
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsActive { get; set; }
}
