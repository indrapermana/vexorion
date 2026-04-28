using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CustomerListItemResponse : IEntityListResponse<Customer>
{
    public Guid Id { get; set; }
    public string CustomerNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}
