using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VexorionERP;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class JwtTokenServiceTests
{
    private static JwtTokenService BuildService(string dbName, out AppDbContext db, out UserManager<User> userManager, out IServiceScope scope)
    {
        (db, userManager, scope) = IdentityTestHelper.CreateScopedServices(dbName);
        var options = Options.Create(new JwtOptions
        {
            Issuer = "VexorionERP.Tests",
            Audience = "VexorionERP.Tests",
            SecretKey = "this-is-a-very-long-test-secret-key-for-hmac-sha256",
            AccessTokenMinutes = 30,
            RefreshTokenDays = 7,
        });

        return new JwtTokenService(db, userManager, options);
    }

    [Fact]
    public async Task IssueTokenPairAsync_CreatesRefreshTokenAndAccessToken()
    {
        var tenantId = Guid.NewGuid();
        var service = BuildService(nameof(IssueTokenPairAsync_CreatesRefreshTokenAndAccessToken), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        await IdentityTestHelper.SeedRolesAsync(scope);
        var user = new User
        {
            TenantId = tenantId,
            UserName = "manager",
            Email = "manager@vx.test",
            FirstName = "Mgr",
            LastName = "User",
        };
        await userManager.CreateAsync(user, "Pass1");
        await userManager.AddToRoleAsync(user, AppRoles.Manager);

        var result = await service.IssueTokenPairAsync(user, "127.0.0.1", "xunit");

        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(result.RefreshToken));
        Assert.True(result.RefreshTokenExpiresAtUtc > DateTime.UtcNow);
        Assert.True(result.ExpiresAtUtc > DateTime.UtcNow);

        var refreshEntity = db.RefreshTokens.Single();
        Assert.Equal(user.Id, refreshEntity.UserId);
        Assert.Equal(tenantId, refreshEntity.TenantId);
        Assert.Equal("127.0.0.1", refreshEntity.CreatedByIpAddress);
        Assert.Equal("xunit", refreshEntity.UserAgent);
    }

    [Fact]
    public async Task IssueTokenPairAsync_EmbedsRoleTenantAndPermissionClaims()
    {
        var service = BuildService(nameof(IssueTokenPairAsync_EmbedsRoleTenantAndPermissionClaims), out _, out var userManager, out var scope);
        using var disposeScope = scope;

        await IdentityTestHelper.SeedRolesAsync(scope);
        var tenantId = Guid.NewGuid();
        var user = new User
        {
            TenantId = tenantId,
            UserName = "staff",
            Email = "staff@vx.test",
            FirstName = "Staff",
            LastName = "Member",
        };
        await userManager.CreateAsync(user, "Pass1");
        await userManager.AddToRoleAsync(user, AppRoles.Staff);

        var result = await service.IssueTokenPairAsync(user, null, null);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.AccessToken);
        Assert.Contains(jwt.Claims, c => (c.Type == ClaimTypes.Role || c.Type == "role") && c.Value == AppRoles.Staff);
        Assert.Contains(jwt.Claims, c => c.Type == AppClaimTypes.TenantId && c.Value == tenantId.ToString());
        Assert.Contains(jwt.Claims, c => c.Type == AppClaimTypes.Permission && c.Value == AppPermissions.Reports.View);
        Assert.Contains(jwt.Claims, c => c.Type == "given_name" && c.Value == "Staff");
        Assert.Contains(jwt.Claims, c => c.Type == "family_name" && c.Value == "Member");
    }

    [Fact]
    public async Task RefreshAsync_WithUnknownToken_ReturnsNull()
    {
        var service = BuildService(nameof(RefreshAsync_WithUnknownToken_ReturnsNull), out _, out _, out var scope);
        using var disposeScope = scope;

        var result = await service.RefreshAsync("not-a-token", "127.0.0.1", "xunit");

        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshAsync_WithExpiredToken_ReturnsNull()
    {
        var service = BuildService(nameof(RefreshAsync_WithExpiredToken_ReturnsNull), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        var tenantId = Guid.NewGuid();
        var user = new User { TenantId = tenantId, UserName = "u1", Email = "u1@vx.test" };
        await userManager.CreateAsync(user, "Pass1");

        var issued = await service.IssueTokenPairAsync(user, null, null);
        var token = db.RefreshTokens.Single();
        token.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        var refreshed = await service.RefreshAsync(issued.RefreshToken, "10.0.0.1", "xunit");

        Assert.Null(refreshed);
    }

    [Fact]
    public async Task RefreshAsync_WithInactiveUser_ReturnsNull()
    {
        var service = BuildService(nameof(RefreshAsync_WithInactiveUser_ReturnsNull), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        var tenantId = Guid.NewGuid();
        var user = new User { TenantId = tenantId, UserName = "u2", Email = "u2@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Pass1");

        var issued = await service.IssueTokenPairAsync(user, null, null);
        user.IsActive = false;
        await userManager.UpdateAsync(user);

        var refreshed = await service.RefreshAsync(issued.RefreshToken, "10.0.0.1", "xunit");

        Assert.Null(refreshed);
        Assert.Single(db.RefreshTokens);
    }

    [Fact]
    public async Task RefreshAsync_RevokesOldTokenAndCreatesReplacement()
    {
        var service = BuildService(nameof(RefreshAsync_RevokesOldTokenAndCreatesReplacement), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        await IdentityTestHelper.SeedRolesAsync(scope);
        var tenantId = Guid.NewGuid();
        var user = new User { TenantId = tenantId, UserName = "u3", Email = "u3@vx.test" };
        await userManager.CreateAsync(user, "Pass1");
        await userManager.AddToRoleAsync(user, AppRoles.Manager);

        var issued = await service.IssueTokenPairAsync(user, "1.1.1.1", "ua1");

        var refreshed = await service.RefreshAsync(issued.RefreshToken, "2.2.2.2", "ua2");

        Assert.NotNull(refreshed);
        Assert.NotEqual(issued.RefreshToken, refreshed!.RefreshToken);
        Assert.Equal(2, db.RefreshTokens.Count());

        var oldToken = db.RefreshTokens.OrderBy(x => x.CreatedAtUtc).First();
        Assert.NotNull(oldToken.RevokedAtUtc);
        Assert.Equal("2.2.2.2", oldToken.RevokedByIpAddress);
        Assert.False(string.IsNullOrWhiteSpace(oldToken.ReplacedByTokenHash));

        var newToken = db.RefreshTokens.OrderByDescending(x => x.CreatedAtUtc).First();
        Assert.Null(newToken.RevokedAtUtc);
        Assert.Equal("2.2.2.2", newToken.CreatedByIpAddress);
        Assert.Equal("ua2", newToken.UserAgent);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_RevokeOnceAndIgnoreSecondCall()
    {
        var service = BuildService(nameof(RevokeRefreshTokenAsync_RevokeOnceAndIgnoreSecondCall), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        var tenantId = Guid.NewGuid();
        var user = new User { TenantId = tenantId, UserName = "u4", Email = "u4@vx.test" };
        await userManager.CreateAsync(user, "Pass1");

        var issued = await service.IssueTokenPairAsync(user, null, null);

        await service.RevokeRefreshTokenAsync(issued.RefreshToken, "9.9.9.9");
        await service.RevokeRefreshTokenAsync(issued.RefreshToken, "8.8.8.8");

        var token = db.RefreshTokens.Single();
        Assert.NotNull(token.RevokedAtUtc);
        Assert.Equal("9.9.9.9", token.RevokedByIpAddress);
    }

    [Fact]
    public async Task RevokeAllUserRefreshTokensAsync_OnlyRevokesMatchingTenantAndUser()
    {
        var service = BuildService(nameof(RevokeAllUserRefreshTokensAsync_OnlyRevokesMatchingTenantAndUser), out var db, out var userManager, out var scope);
        using var disposeScope = scope;

        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var userA = new User { TenantId = tenantA, UserName = "uA", Email = "ua@vx.test" };
        var userB = new User { TenantId = tenantB, UserName = "uB", Email = "ub@vx.test" };
        await userManager.CreateAsync(userA, "Pass1");
        await userManager.CreateAsync(userB, "Pass1");

        await service.IssueTokenPairAsync(userA, null, null);
        await service.IssueTokenPairAsync(userA, null, null);
        await service.IssueTokenPairAsync(userB, null, null);

        await service.RevokeAllUserRefreshTokensAsync(userA.Id, tenantA, "3.3.3.3");

        var userATokens = db.RefreshTokens.Where(x => x.UserId == userA.Id).ToList();
        var userBTokens = db.RefreshTokens.Where(x => x.UserId == userB.Id).ToList();

        Assert.Equal(2, userATokens.Count);
        Assert.All(userATokens, t => Assert.NotNull(t.RevokedAtUtc));
        Assert.All(userATokens, t => Assert.Equal("3.3.3.3", t.RevokedByIpAddress));

        Assert.Single(userBTokens);
        Assert.Null(userBTokens[0].RevokedAtUtc);
    }
}
