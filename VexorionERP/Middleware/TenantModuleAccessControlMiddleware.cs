using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;

namespace VexorionERP.Middleware;

public sealed class TenantModuleAccessControlMiddleware(RequestDelegate next)
{
    private static readonly (PathString Prefix, ModuleArea Area)[] ProtectedAreas =
    [
        (new PathString("/api/project-categories"), ModuleArea.Project),
        (new PathString("/api/projects"), ModuleArea.Project),
        (new PathString("/api/tenant-relationships"), ModuleArea.Project),
        (new PathString("/api/employees"), ModuleArea.Employee),
        (new PathString("/api/consultants"), ModuleArea.Employee)
    ];

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
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"message\":\"This module is disabled for the current tenant.\"}");
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