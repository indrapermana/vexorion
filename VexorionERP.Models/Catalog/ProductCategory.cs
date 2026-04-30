using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProductCategory : TenantEntityBase
{
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;

    public ICollection<ProductCategoryAssignment> ProductCategoryAssignments { get; set; } = [];
}
