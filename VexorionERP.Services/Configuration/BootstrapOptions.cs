namespace VexorionERP.Configuration;

public class BootstrapOptions
{
    public const string SectionName = "Bootstrap";

    public bool Enabled { get; set; }
    public TenantSeedOptions Tenant { get; set; } = new();
    public CompanySeedOptions Company { get; set; } = new();
    public AdminUserSeedOptions AdminUser { get; set; } = new();
}

public class TenantSeedOptions
{
    public string Name { get; set; } = "Default Tenant";
    public string Code { get; set; } = "default";
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
    public string? Password { get; set; }
    public string FirstName { get; set; } = "System";
    public string LastName { get; set; } = "Administrator";
}