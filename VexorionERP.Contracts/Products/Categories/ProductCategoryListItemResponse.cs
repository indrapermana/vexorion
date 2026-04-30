using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProductCategoryListItemResponse : IEntityListResponse<ProductCategory>
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
