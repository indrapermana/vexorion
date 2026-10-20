namespace VexorionERP;

public class BootstrapOptions
{
    public const string SectionName = "Bootstrap";

    public TenantSeedOptions Tenant { get; set; } = new();
    public CompanySeedOptions Company { get; set; } = new();
    public AdminUserSeedOptions AdminUser { get; set; } = new();
    public string? AdminPassword { get; set; }
}

public class TenantSeedOptions
{
    public string Name { get; set; } = "VexorionERP";
    public string Code { get; set; } = "vexorionerp";
    public string? Domain { get; set; }
}

public class CompanySeedOptions
{
    public string Name { get; set; } = "Default Company";
    public string Code { get; set; } = "MAIN";
}

public class AdminUserSeedOptions
{
    public string UserName { get; set; } = "admin";
    public string Email { get; set; } = "admin@vexorion.local";
    public string FirstName { get; set; } = "System";
    public string LastName { get; set; } = "Administrator";
}
