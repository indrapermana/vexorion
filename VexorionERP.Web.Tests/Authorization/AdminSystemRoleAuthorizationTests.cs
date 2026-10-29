using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests.Authorization;

public class AdminSystemRoleAuthorizationTests
{
    public static TheoryData<Type, string> SystemAdminEndpoints => new()
    {
        { typeof(UsersController), nameof(UsersController.GetAllForAdmin) },
        { typeof(TenantsController), nameof(TenantsController.GetAllForAdmin) },
        { typeof(TenantsController), nameof(TenantsController.GetModuleEffectiveAccess) },
        { typeof(TenantsController), nameof(TenantsController.Update) },
        { typeof(TenantsController), nameof(TenantsController.Delete) },
        { typeof(TenantsController), nameof(TenantsController.GetTenantMenuConfiguration) },
        { typeof(TenantsController), nameof(TenantsController.UpdateTenantMenuConfiguration) },
        { typeof(TenantsController), nameof(TenantsController.GetTelemetry) },
        { typeof(TenantModuleConfigController), nameof(TenantModuleConfigController.GetEffective) },
        { typeof(TenantModuleConfigController), nameof(TenantModuleConfigController.Update) },
        { typeof(AuditLogsController), nameof(AuditLogsController.GetAdminLifecycle) },
    };

    [Theory]
    [MemberData(nameof(SystemAdminEndpoints))]
    public void AdminEndpoint_RequiresSystemAdminRole(Type controllerType, string methodName)
    {
        var method = controllerType.GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);

        Assert.NotNull(method);
        var authorizeAttributes = method.GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        Assert.Contains(
            authorizeAttributes,
            attribute => SplitRoles(attribute.Roles).Contains(AppRoles.SystemAdmin, StringComparer.Ordinal));
    }

    private static IEnumerable<string> SplitRoles(string? roles) =>
        roles?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        ?? [];
}
