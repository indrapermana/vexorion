namespace VexorionERP.Contracts;

public class RolePermissionsResponse
{
    public string Role { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Permissions { get; set; } = [];
}
