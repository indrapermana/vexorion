namespace VexorionERP.Models.Identity;

public static class AppRoles
{
    public const string SystemAdmin = "SystemAdmin";
    public const string TenantAdmin = "TenantAdmin";
    public const string Manager = "Manager";
    public const string Staff = "Staff";

    public static IReadOnlyCollection<string> All { get; } =
    [
        SystemAdmin,
        TenantAdmin,
        Manager,
        Staff
    ];
}