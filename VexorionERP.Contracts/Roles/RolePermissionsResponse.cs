namespace VexorionERP.Contracts.Roles;

public class RolePermissionsResponse
{
    public string Role { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Permissions { get; set; } = [];
}