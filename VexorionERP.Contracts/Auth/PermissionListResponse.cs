namespace VexorionERP.Contracts.Auth;

public class PermissionListResponse
{
    public IReadOnlyCollection<string> Permissions { get; set; } = [];
}