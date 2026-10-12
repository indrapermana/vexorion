namespace VexorionERP;

public class TenantGovernanceDefaultsOptions
{
    public const string SectionName = "TenantGovernanceDefaults";

    public bool BackfillExistingTenantsOnStartup { get; set; } = true;
    public bool CreateDefaultsOnTenantOnboarding { get; set; } = true;
    public TenantModuleDefaultOptions Modules { get; set; } = new();
    public TenantPlanDefaultOptions Plan { get; set; } = new();
}

public class TenantModuleDefaultOptions
{
    public bool ProjectManagementEnabled { get; set; } = true;
    public bool DocumentManagementEnabled { get; set; } = true;
    public bool EmployeeManagementEnabled { get; set; } = true;
    public bool SalesEnabled { get; set; } = true;
    public bool PurchasingEnabled { get; set; } = true;
    public bool InventoryEnabled { get; set; } = true;
}

public class TenantPlanDefaultOptions
{
    public string PlanCode { get; set; } = "STARTER";
    public string PlanName { get; set; } = "Starter";
    public long MaxStorageBytes { get; set; } = 5L * 1024 * 1024 * 1024;
    public long MaxFileSizeBytes { get; set; } = 100L * 1024 * 1024;
    public int WarningThresholdPercent { get; set; } = 80;
    public int SoftBlockThresholdPercent { get; set; } = 95;
    public int HardBlockThresholdPercent { get; set; } = 100;
}