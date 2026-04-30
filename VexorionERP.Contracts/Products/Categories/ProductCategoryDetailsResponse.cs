using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProductCategoryDetailsResponse : IEntityResponse<ProductCategory>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
