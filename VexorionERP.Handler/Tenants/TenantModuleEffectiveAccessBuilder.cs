using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

internal static class TenantModuleEffectiveAccessBuilder
{
    public static TenantModuleEffectiveAccessResponse Build(
        Tenant tenant,
        TenantModuleConfig? config,
        TenantModuleRolloutOptions rolloutOptions) => new()
    {
        TenantId = tenant.Id,
        TenantCode = tenant.Code,
        Project = BuildModuleAccess(config?.ProjectManagementEnabled ?? true, rolloutOptions.Project, rolloutOptions.Enabled, tenant.Id, tenant.Code),
        Document = BuildModuleAccess(config?.DocumentManagementEnabled ?? true, rolloutOptions.Document, rolloutOptions.Enabled, tenant.Id, tenant.Code),
        Employee = BuildModuleAccess(config?.EmployeeManagementEnabled ?? true, rolloutOptions.Employee, rolloutOptions.Enabled, tenant.Id, tenant.Code)
    };

    private static TenantModuleEffectiveAccessItemResponse BuildModuleAccess(
        bool toggleEnabled,
        ModuleRolloutAreaOptions areaOptions,
        bool rolloutGloballyEnabled,
        Guid tenantId,
        string tenantCode)
    {
        var rolloutGateEnabled = rolloutGloballyEnabled && areaOptions.Enabled;
        var allowedByRollout = !rolloutGateEnabled
            || areaOptions.AllowedTenantIds.Contains(tenantId)
            || !areaOptions.Mode.Equals("AllowList", StringComparison.OrdinalIgnoreCase)
            || areaOptions.AllowedTenantCodes.Any(code => string.Equals(code.Trim(), tenantCode.Trim(), StringComparison.OrdinalIgnoreCase));

        return new TenantModuleEffectiveAccessItemResponse
        {
            ToggleEnabled = toggleEnabled,
            RolloutGateEnabled = rolloutGateEnabled,
            RolloutMode = areaOptions.Mode,
            AllowedByRollout = allowedByRollout,
            EffectiveEnabled = toggleEnabled && allowedByRollout
        };
    }
}
