using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantModuleEffectiveAccessQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantModuleEffectiveAccessQuery, ServiceResult<TenantModuleEffectiveAccessResponse>>
{
    public async ValueTask<ServiceResult<TenantModuleEffectiveAccessResponse>> Handle(
        GetTenantModuleEffectiveAccessQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var rolloutOptions = serviceProvider.GetRequiredService<IOptions<TenantModuleRolloutOptions>>().Value;

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.TenantId, cancellationToken);

        if (tenant is null)
        {
            return ServiceResult<TenantModuleEffectiveAccessResponse>.Failure(404, "Tenant not found.");
        }

        var config = await dbContext.TenantModuleConfigs
            .GetByTenant(request.TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        var response = new TenantModuleEffectiveAccessResponse
        {
            TenantId = request.TenantId,
            TenantCode = tenant.Code,
            Project = BuildModuleAccess(
                toggleEnabled: config?.ProjectManagementEnabled ?? true,
                areaOptions: rolloutOptions.Project,
                rolloutGloballyEnabled: rolloutOptions.Enabled,
                tenantId: request.TenantId,
                tenantCode: tenant.Code),
            Document = BuildModuleAccess(
                toggleEnabled: config?.DocumentManagementEnabled ?? true,
                areaOptions: rolloutOptions.Document,
                rolloutGloballyEnabled: rolloutOptions.Enabled,
                tenantId: request.TenantId,
                tenantCode: tenant.Code),
            Employee = BuildModuleAccess(
                toggleEnabled: config?.EmployeeManagementEnabled ?? true,
                areaOptions: rolloutOptions.Employee,
                rolloutGloballyEnabled: rolloutOptions.Enabled,
                tenantId: request.TenantId,
                tenantCode: tenant.Code)
        };

        return ServiceResult<TenantModuleEffectiveAccessResponse>.Success(response);
    }

    private static TenantModuleEffectiveAccessItemResponse BuildModuleAccess(
        bool toggleEnabled,
        ModuleRolloutAreaOptions areaOptions,
        bool rolloutGloballyEnabled,
        Guid tenantId,
        string tenantCode)
    {
        var rolloutGateEnabled = rolloutGloballyEnabled && areaOptions.Enabled;
        var allowedByRollout = IsAllowedByRollout(rolloutGateEnabled, areaOptions, tenantId, tenantCode);

        return new TenantModuleEffectiveAccessItemResponse
        {
            ToggleEnabled = toggleEnabled,
            RolloutGateEnabled = rolloutGateEnabled,
            RolloutMode = areaOptions.Mode,
            AllowedByRollout = allowedByRollout,
            EffectiveEnabled = toggleEnabled && allowedByRollout
        };
    }

    private static bool IsAllowedByRollout(
        bool rolloutGateEnabled,
        ModuleRolloutAreaOptions areaOptions,
        Guid tenantId,
        string tenantCode)
    {
        if (!rolloutGateEnabled)
        {
            return true;
        }

        if (areaOptions.AllowedTenantIds.Contains(tenantId))
        {
            return true;
        }

        if (!areaOptions.Mode.Equals("AllowList", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (areaOptions.AllowedTenantCodes.Count == 0)
        {
            return false;
        }

        var normalizedTenantCode = tenantCode.Trim().ToUpperInvariant();
        return areaOptions.AllowedTenantCodes
            .Any(code => string.Equals(code.Trim(), normalizedTenantCode, StringComparison.OrdinalIgnoreCase));
    }
}