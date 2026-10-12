using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VexorionERP.Database;

namespace VexorionERP.Middleware;

public sealed class TenantModuleAccessControlMiddleware(
    RequestDelegate next,
    IOptions<TenantModuleRolloutOptions> rolloutOptions)
{
    private static readonly (PathString Prefix, ModuleArea Area)[] ProtectedAreas =
    [
        (new PathString("/api/project-categories"), ModuleArea.Project),
        (new PathString("/api/projects"), ModuleArea.Project),
        (new PathString("/api/project-documents"), ModuleArea.Document),
        (new PathString("/api/tenant-relationships"), ModuleArea.Project),
        (new PathString("/api/employees"), ModuleArea.Employee),
        (new PathString("/api/consultants"), ModuleArea.Employee)
    ];

    private readonly TenantModuleRolloutOptions _rolloutOptions = rolloutOptions.Value;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!TryResolveArea(context.Request.Path, out var area))
        {
            await next(context);
            return;
        }

        var tenantProvider = context.RequestServices.GetRequiredService<ICurrentTenantProvider>();
        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            await next(context);
            return;
        }

        var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
        var config = await dbContext.TenantModuleConfigs
            .GetByTenant(tenantId.Value)
            .AsNoTracking()
            .FirstOrDefaultAsync(context.RequestAborted);

        // Preserve existing behavior for tenants that have not configured module toggles yet.
        if (config is null)
        {
            await next(context);
            return;
        }

        var enabled = area switch
        {
            ModuleArea.Project => config.ProjectManagementEnabled,
            ModuleArea.Document => config.DocumentManagementEnabled,
            ModuleArea.Employee => config.EmployeeManagementEnabled,
            _ => true
        };

        if (enabled)
        {
            enabled = await IsEnabledByRolloutAsync(area, tenantId.Value, dbContext, context.RequestAborted);
        }

        if (enabled)
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        var problem = ApiProblemDetailsFactory.Create(
            context,
            StatusCodes.Status403Forbidden,
            "This module is disabled for the current tenant. Contact an administrator to enable it.",
            "module.disabled");
        await context.Response.WriteAsJsonAsync(problem, context.RequestAborted);
    }

    private static bool TryResolveArea(PathString path, out ModuleArea area)
    {
        if (path.StartsWithSegments("/api/projects", StringComparison.OrdinalIgnoreCase))
        {
            var value = path.Value ?? string.Empty;
            if (value.Contains("/documents", StringComparison.OrdinalIgnoreCase)
                || value.Contains("/folders", StringComparison.OrdinalIgnoreCase))
            {
                area = ModuleArea.Document;
                return true;
            }
        }

        foreach (var candidate in ProtectedAreas)
        {
            if (path.StartsWithSegments(candidate.Prefix, StringComparison.OrdinalIgnoreCase))
            {
                area = candidate.Area;
                return true;
            }
        }

        area = default;
        return false;
    }

    private async Task<bool> IsEnabledByRolloutAsync(
        ModuleArea area,
        Guid tenantId,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!_rolloutOptions.Enabled)
        {
            return true;
        }

        var areaOptions = area switch
        {
            ModuleArea.Project => _rolloutOptions.Project,
            ModuleArea.Document => _rolloutOptions.Document,
            ModuleArea.Employee => _rolloutOptions.Employee,
            _ => null
        };

        if (areaOptions is null || !areaOptions.Enabled)
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

        var normalizedTenantCode = (await dbContext.Tenants
            .AsNoTracking()
            .Where(x => x.Id == tenantId)
            .Select(x => x.Code)
            .FirstOrDefaultAsync(cancellationToken))
            ?.Trim()
            .ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(normalizedTenantCode))
        {
            return false;
        }

        return areaOptions.AllowedTenantCodes
            .Any(code => string.Equals(code.Trim(), normalizedTenantCode, StringComparison.OrdinalIgnoreCase));
    }

    private enum ModuleArea
    {
        Project,
        Document,
        Employee
    }
}

public static class TenantModuleAccessControlMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantModuleAccessControl(this IApplicationBuilder app)
    {
        app.UseMiddleware<TenantModuleAccessControlMiddleware>();
        return app;
    }
}
