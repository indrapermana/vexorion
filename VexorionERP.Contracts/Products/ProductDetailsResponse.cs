namespace VexorionERP.Contracts.Products;

public class ProductDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal StandardCost { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsActive { get; set; }
}