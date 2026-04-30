using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

/// <summary>
/// Tests for the synchronous / stateless methods on AuthApplicationService
/// that only inspect the ClaimsPrincipal (no DB access needed).
/// </summary>
public class AuthServiceStatelessTests
{
    private static AuthApplicationService BuildService()
    {
        // These parameters are not used by the methods under test (GetPermissions),
        // so we pass nulls with null-forgiving. Any test that calls methods which
        // dereference them will fail early — intentionally.
        return new AuthApplicationService(null!, null!, null!, null!, null!, null!);
    }

    [Fact]
    public void GetPermissions_WithNoClaims_ReturnsEmptyList()
    {
        var service = BuildService();
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        var result = service.GetPermissions(principal);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.Permissions);
    }

    [Fact]
    public void GetPermissions_WithPermissionClaims_ReturnsSortedDistinctValues()
    {
        var service = BuildService();
        var claims = new[]
        {
            new Claim(AppClaimTypes.Permission, "reports.view"),
            new Claim(AppClaimTypes.Permission, "users.view"),
            new Claim(AppClaimTypes.Permission, "reports.view"), // duplicate
            new Claim(ClaimTypes.Name, "alice")                   // ignored
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

        var result = service.GetPermissions(principal);

        Assert.True(result.Succeeded);
        Assert.Equal(new[] { "reports.view", "users.view" }, result.Value!.Permissions);
    }
}

/// <summary>
/// Tests for TenantOnboardingService guard clauses (no real onboarding needed).
/// </summary>
public class TenantOnboardingServiceTests
{
    private static OnboardTenantRequest ValidRequest(string code) => new()
    {
        TenantName = "Acme Corp",
        TenantCode = code,
        CompanyName = "Acme Inc",
        CompanyCode = code + "CO",
        AdminUserName = "admin",
        AdminEmail = "admin@acme.com",
        AdminPassword = "Admin@1234",
        FirstName = "Admin",
        LastName = "User"
    };

    [Fact]
    public async Task Onboard_WhenSecondTenantAndNotSystemAdmin_Returns403()
    {
        var dbName = nameof(Onboard_WhenSecondTenantAndNotSystemAdmin_Returns403);
        var (dbContext, userManager, scope) = IdentityTestHelper.CreateScopedServices(dbName);
        await using (scope as IAsyncDisposable ?? (IAsyncDisposable?)null)
        {
            // Seed an existing tenant so hasExistingTenants == true
            dbContext.Tenants.Add(new Tenant { Id = Guid.NewGuid(), Name = "Existing", Code = "EX" });
            await dbContext.SaveChangesAsync();

            var service = new TenantOnboardingService(dbContext, userManager, new NoOpAuditLogger());
            // Principal without SystemAdmin role
            var principal = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "Test"));

            var result = await service.OnboardAsync(ValidRequest("ACME"), principal);

            Assert.False(result.Succeeded);
            Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
        }
    }

    [Fact]
    public async Task Onboard_WhenTenantCodeAlreadyExists_Returns409()
    {
        var dbName = nameof(Onboard_WhenTenantCodeAlreadyExists_Returns409);
        var (dbContext, userManager, scope) = IdentityTestHelper.CreateScopedServices(dbName);
        await using (scope as IAsyncDisposable ?? (IAsyncDisposable?)null)
        {
            // Seed an existing tenant with the same code
            dbContext.Tenants.Add(new Tenant { Id = Guid.NewGuid(), Name = "Existing", Code = "DUPE" });
            await dbContext.SaveChangesAsync();

            var service = new TenantOnboardingService(dbContext, userManager, new NoOpAuditLogger());
            // Principal with SystemAdmin so the first guard is bypassed
            var principal = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Role, AppRoles.SystemAdmin)
                ], "Test"));

            var result = await service.OnboardAsync(ValidRequest("DUPE"), principal);

            Assert.False(result.Succeeded);
            Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
        }
    }

    [Fact]
    public async Task Onboard_FirstTenant_SucceedsAndReturnsTenantAndAdminIds()
    {
        var dbName = nameof(Onboard_FirstTenant_SucceedsAndReturnsTenantAndAdminIds);
        var (dbContext, userManager, scope) = IdentityTestHelper.CreateScopedServices(dbName);
        await using (scope as IAsyncDisposable ?? (IAsyncDisposable?)null)
        {
            await IdentityTestHelper.SeedRolesAsync(scope);

            var service = new TenantOnboardingService(dbContext, userManager, new NoOpAuditLogger());
            // Any principal is fine for first tenant
            var principal = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "Test"));

            var result = await service.OnboardAsync(ValidRequest("NEWCO"), principal);

            Assert.True(result.Succeeded);
            Assert.NotEqual(Guid.Empty, result.Value!.TenantId);
            Assert.NotEqual(Guid.Empty, result.Value.AdminUserId);
            Assert.NotEqual(Guid.Empty, result.Value.CompanyId);
        }
    }
}
