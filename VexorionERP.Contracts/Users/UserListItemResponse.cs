using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UserListItemResponse : IEntityListResponse<User>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = [];
}
