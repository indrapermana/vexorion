using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProductIdentifierListItemResponse : IEntityListResponse<ProductIdentifier>
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string CodeType { get; set; } = string.Empty;
    public string CodeValue { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; }
}
