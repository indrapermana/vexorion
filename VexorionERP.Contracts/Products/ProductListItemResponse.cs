namespace VexorionERP.Contracts;

public class ProductListItemResponse
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsActive { get; set; }
}
