using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class RoleManagementServiceTests
{
    // ── GetRolePermissions ────────────────────────────────────────────────────

    [Fact]
    public void GetRolePermissions_ReturnsAllFourRoles()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(GetRolePermissions_ReturnsAllFourRoles));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(Guid.NewGuid()), new NoOpAuditLogger());

        var result = service.GetRolePermissions();

        Assert.True(result.Succeeded);
        Assert.Equal(4, result.Value!.Count);
        Assert.Contains(result.Value, r => r.Role == AppRoles.SystemAdmin);
        Assert.Contains(result.Value, r => r.Role == AppRoles.TenantAdmin);
        Assert.Contains(result.Value, r => r.Role == AppRoles.Manager);
        Assert.Contains(result.Value, r => r.Role == AppRoles.Staff);
    }

    [Fact]
    public void GetRolePermissions_IsOrderedAlphabetically()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(GetRolePermissions_IsOrderedAlphabetically));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(Guid.NewGuid()), new NoOpAuditLogger());

        var result = service.GetRolePermissions();

        var roles = result.Value!.Select(r => r.Role).ToArray();
        Assert.Equal(roles.OrderBy(x => x).ToArray(), roles);
    }

    [Fact]
    public void GetRolePermissions_SystemAdminContainsAllPermissions()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(GetRolePermissions_SystemAdminContainsAllPermissions));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(Guid.NewGuid()), new NoOpAuditLogger());

        var result = service.GetRolePermissions();

        var systemAdminEntry = result.Value!.Single(r => r.Role == AppRoles.SystemAdmin);
        foreach (var permission in AppPermissions.All)
        {
            Assert.Contains(permission, systemAdminEntry.Permissions);
        }
    }

    // ── AssignUserRoles – guard clauses ──────────────────────────────────────

    [Fact]
    public async Task AssignUserRoles_WhenNoTenantContext_ReturnsBadRequest()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(AssignUserRoles_WhenNoTenantContext_ReturnsBadRequest));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(null), new NoOpAuditLogger());

        var result = await service.AssignUserRolesAsync(
            Guid.NewGuid(),
            new AssignUserRolesRequest { Roles = [AppRoles.Staff] },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task AssignUserRoles_WhenInvalidRolesProvided_ReturnsValidationFailure()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(AssignUserRoles_WhenInvalidRolesProvided_ReturnsValidationFailure));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(Guid.NewGuid()), new NoOpAuditLogger());

        var result = await service.AssignUserRolesAsync(
            Guid.NewGuid(),
            new AssignUserRolesRequest { Roles = ["NonExistentRole"] },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.True(result.Validation.Errors.ContainsKey("Roles"));
    }

    [Fact]
    public async Task AssignUserRoles_WhenUserNotFound_Returns404()
    {
        var (userManager, _) = IdentityTestHelper.CreateUserManager(nameof(AssignUserRoles_WhenUserNotFound_Returns404));
        var service = new RoleManagementService(userManager, new FixedTenantProvider(Guid.NewGuid()), new NoOpAuditLogger());

        var result = await service.AssignUserRolesAsync(
            Guid.NewGuid(),
            new AssignUserRolesRequest { Roles = [AppRoles.Staff] },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task AssignUserRoles_WhenValidRequest_Succeeds()
    {
        var tenantId = Guid.NewGuid();
        var dbName = nameof(AssignUserRoles_WhenValidRequest_Succeeds);
        var (userManager, provider) = IdentityTestHelper.CreateUserManager(dbName);
        await IdentityTestHelper.SeedRolesAsync(provider);

        var user = new User { TenantId = tenantId, UserName = "testuser", Email = "test@example.com" };
        await userManager.CreateAsync(user, "Test@1");

        var service = new RoleManagementService(userManager, new FixedTenantProvider(tenantId), new NoOpAuditLogger());
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));

        var result = await service.AssignUserRolesAsync(
            user.Id,
            new AssignUserRolesRequest { Roles = [AppRoles.Staff, AppRoles.Manager] },
            principal);

        Assert.True(result.Succeeded);
        var roles = await userManager.GetRolesAsync(user);
        Assert.Contains(AppRoles.Staff, roles);
        Assert.Contains(AppRoles.Manager, roles);
    }
}


