namespace VexorionERP;

public class TenantModuleRolloutOptions
{
    public const string SectionName = "TenantModuleRollout";

    public bool Enabled { get; set; }
    public ModuleRolloutAreaOptions Project { get; set; } = new();
    public ModuleRolloutAreaOptions Document { get; set; } = new();
    public ModuleRolloutAreaOptions Employee { get; set; } = new();
}

public class ModuleRolloutAreaOptions
{
    public bool Enabled { get; set; }
    public string Mode { get; set; } = "AllowAll";
    public List<Guid> AllowedTenantIds { get; set; } = [];
    public List<string> AllowedTenantCodes { get; set; } = [];
}