using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class SupplierListItemResponse : IEntityListResponse<Supplier>
{
    public Guid Id { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}
