using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class UserManagementServiceTests
{
    private static UserManagementService BuildService(
        string dbName,
        Guid? tenantId,
        out Microsoft.AspNetCore.Identity.UserManager<User> userManager,
        out IServiceProvider provider)
    {
        (userManager, provider) = IdentityTestHelper.CreateUserManager(dbName);
        return new UserManagementService(
            userManager,
            new FixedTenantProvider(tenantId),
            new FakeTokenService(),
            new NoOpAuditLogger());
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_WhenNoTenantContext_ReturnsBadRequest()
    {
        var service = BuildService(nameof(GetAll_WhenNoTenantContext_ReturnsBadRequest), null, out _, out _);

        var result = await service.GetAllAsync();

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task GetAll_WhenTenantHasNoUsers_ReturnsEmptyList()
    {
        var tenantId = Guid.NewGuid();
        var service = BuildService(nameof(GetAll_WhenTenantHasNoUsers_ReturnsEmptyList), tenantId, out _, out _);

        var result = await service.GetAllAsync();

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task GetAll_ReturnsOnlyUsersMatchingTenant()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var dbName = nameof(GetAll_ReturnsOnlyUsersMatchingTenant);
        var service = BuildService(dbName, tenantId, out var userManager, out _);

        await userManager.CreateAsync(new User { TenantId = tenantId, UserName = "user1", Email = "u1@t.com" }, "pass");
        await userManager.CreateAsync(new User { TenantId = tenantId, UserName = "user2", Email = "u2@t.com" }, "pass");
        await userManager.CreateAsync(new User { TenantId = otherTenantId, UserName = "other", Email = "other@t.com" }, "pass");

        var result = await service.GetAllAsync();

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Count);
        Assert.All(result.Value, u => Assert.Equal(tenantId, u.TenantId));
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WhenNoTenantContext_ReturnsBadRequest()
    {
        var service = BuildService(nameof(Create_WhenNoTenantContext_ReturnsBadRequest), null, out _, out _);

        var result = await service.CreateAsync(
            new CreateUserRequest
            {
                UserName = "user",
                Email = "u@t.com",
                Password = "pass",
                Roles = []
            },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_WhenUnknownRolesProvided_ReturnsValidationFailure()
    {
        var service = BuildService(nameof(Create_WhenUnknownRolesProvided_ReturnsValidationFailure), Guid.NewGuid(), out _, out _);

        var result = await service.CreateAsync(
            new CreateUserRequest
            {
                UserName = "user",
                Email = "u@t.com",
                Password = "pass",
                Roles = ["UnknownRole"]
            },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.True(result.Validation.Errors.ContainsKey("Roles"));
    }

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreatedUser()
    {
        var tenantId = Guid.NewGuid();
        var dbName = nameof(Create_WithValidRequest_ReturnsCreatedUser);
        var service = BuildService(dbName, tenantId, out var userManager, out var provider);
        await IdentityTestHelper.SeedRolesAsync(provider);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "Test"));

        var result = await service.CreateAsync(
            new CreateUserRequest
            {
                UserName = "newuser",
                Email = "new@tenant.com",
                Password = "pass",
                FirstName = "Jane",
                LastName = "Doe",
                Roles = [AppRoles.Staff]
            },
            principal);

        Assert.True(result.Succeeded);
        Assert.Equal("newuser", result.Value!.UserName);
        Assert.Equal("Jane", result.Value.FirstName);
        Assert.Contains(AppRoles.Staff, result.Value.Roles);
    }

    // ── SetStatusAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task SetStatus_WhenUserNotFound_Returns404()
    {
        var service = BuildService(nameof(SetStatus_WhenUserNotFound_Returns404), Guid.NewGuid(), out _, out _);

        var result = await service.SetStatusAsync(
            Guid.NewGuid(),
            new DisableUserRequest { IsActive = false },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task SetStatus_WhenUserExists_UpdatesIsActiveFlag()
    {
        var tenantId = Guid.NewGuid();
        var dbName = nameof(SetStatus_WhenUserExists_UpdatesIsActiveFlag);
        var service = BuildService(dbName, tenantId, out var userManager, out _);

        var user = new User { TenantId = tenantId, UserName = "activeuser", Email = "a@t.com", IsActive = true };
        await userManager.CreateAsync(user, "pass");

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));

        var result = await service.SetStatusAsync(user.Id, new DisableUserRequest { IsActive = false }, principal);

        Assert.True(result.Succeeded);
        var updated = await userManager.FindByIdAsync(user.Id.ToString());
        Assert.False(updated!.IsActive);
    }

    // ── ResetPasswordAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task ResetPassword_WhenUserNotFound_Returns404()
    {
        var service = BuildService(nameof(ResetPassword_WhenUserNotFound_Returns404), Guid.NewGuid(), out _, out _);

        var result = await service.ResetPasswordAsync(
            Guid.NewGuid(),
            new ResetPasswordRequest { NewPassword = "newpass" },
            new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WhenUserExists_Succeeds()
    {
        var tenantId = Guid.NewGuid();
        var dbName = nameof(ResetPassword_WhenUserExists_Succeeds);
        var service = BuildService(dbName, tenantId, out var userManager, out _);

        var user = new User { TenantId = tenantId, UserName = "resetuser", Email = "r@t.com" };
        await userManager.CreateAsync(user, "OldPass1");

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));

        var result = await service.ResetPasswordAsync(user.Id, new ResetPasswordRequest { NewPassword = "NewP2" }, principal);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task ResetPassword_WhenNewPasswordIsInvalid_PreservesExistingPassword()
    {
        var tenantId = Guid.NewGuid();
        var service = BuildService(nameof(ResetPassword_WhenNewPasswordIsInvalid_PreservesExistingPassword), tenantId, out var userManager, out _);
        var user = new User { TenantId = tenantId, UserName = "safe-reset", Email = "safe-reset@t.com" };
        await userManager.CreateAsync(user, "OldPass1");
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "Test"));

        var result = await service.ResetPasswordAsync(user.Id, new ResetPasswordRequest { NewPassword = "" }, principal);

        Assert.False(result.Succeeded);
        Assert.True(await userManager.CheckPasswordAsync(user, "OldPass1"));
    }

    // ── UnlockAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Unlock_WhenUserNotFound_Returns404()
    {
        var service = BuildService(nameof(Unlock_WhenUserNotFound_Returns404), Guid.NewGuid(), out _, out _);

        var result = await service.UnlockAsync(Guid.NewGuid(), new ClaimsPrincipal());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Unlock_WhenUserIsLocked_ClearsLockoutFields()
    {
        var tenantId = Guid.NewGuid();
        var dbName = nameof(Unlock_WhenUserIsLocked_ClearsLockoutFields);
        var service = BuildService(dbName, tenantId, out var userManager, out _);

        var user = new User
        {
            TenantId = tenantId,
            UserName = "lockeduser",
            Email = "l@t.com",
            LockoutEnd = DateTimeOffset.UtcNow.AddDays(1),
            AccessFailedCount = 3
        };
        await userManager.CreateAsync(user, "pass");

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));

        var result = await service.UnlockAsync(user.Id, principal);

        Assert.True(result.Succeeded);
        var updated = await userManager.FindByIdAsync(user.Id.ToString());
        Assert.Null(updated!.LockoutEnd);
        Assert.Equal(0, updated.AccessFailedCount);
    }
}
