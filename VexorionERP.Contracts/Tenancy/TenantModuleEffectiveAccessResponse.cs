namespace VexorionERP.Contracts;

public class TenantModuleEffectiveAccessResponse
{
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public TenantModuleEffectiveAccessItemResponse Project { get; set; } = new();
    public TenantModuleEffectiveAccessItemResponse Document { get; set; } = new();
    public TenantModuleEffectiveAccessItemResponse Employee { get; set; } = new();
}

public class TenantModuleEffectiveAccessBatchResponse
{
    public IReadOnlyCollection<TenantModuleEffectiveAccessResponse> Items { get; set; } = [];
    public IReadOnlyCollection<Guid> FailedTenantIds { get; set; } = [];
}

public class TenantModuleEffectiveAccessItemResponse
{
    public bool ToggleEnabled { get; set; }
    public bool RolloutGateEnabled { get; set; }
    public string RolloutMode { get; set; } = "AllowAll";
    public bool AllowedByRollout { get; set; }
    public bool EffectiveEnabled { get; set; }
}
