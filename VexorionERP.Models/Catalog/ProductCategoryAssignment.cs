using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProductCategoryAssignment : TenantEntityBase
{
    public Guid ProductId { get; set; }
    public Guid ProductCategoryId { get; set; }

    public Product? Product { get; set; }
    public ProductCategory? ProductCategory { get; set; }
}
