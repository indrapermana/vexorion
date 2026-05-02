namespace VexorionERP.Models;

public static class AppRoles
{
    public const string SystemAdmin = "SystemAdmin";
    public const string TenantAdmin = "TenantAdmin";
    public const string Manager = "Manager";
    public const string Staff = "Staff";
    public const string PosUser = "PosUser";

    public static IReadOnlyCollection<string> All { get; } =
    [
        SystemAdmin,
        TenantAdmin,
        Manager,
        Staff,
        PosUser
    ];
}
