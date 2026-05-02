using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class AuthApplicationServiceFlowTests
{
    [Fact]
    public async Task LoginAsync_InvalidTenantCode_ReturnsValidationFailure()
    {
        using var scope = BuildScope(nameof(LoginAsync_InvalidTenantCode_ReturnsValidationFailure), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.LoginAsync(new LoginRequest
        {
            TenantCode = "missing",
            UserNameOrEmail = "user@vx.test",
            Password = "Password1!"
        });

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
        Assert.True(result.Validation.Errors.ContainsKey(nameof(LoginRequest.TenantCode)));
    }

    [Fact]
    public async Task LoginAsync_InvalidCredentials_Returns401()
    {
        using var scope = BuildScope(nameof(LoginAsync_InvalidCredentials_Returns401), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);

        var user = new User { TenantId = tenant.Id, UserName = "alice", Email = "alice@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");
        await db.SaveChangesAsync();

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.LoginAsync(new LoginRequest
        {
            TenantCode = "VX",
            UserNameOrEmail = "alice",
            Password = "wrong-password"
        });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status401Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task LoginAsync_Success_IssuesTokenAndWritesAudit()
    {
        using var scope = BuildScope(nameof(LoginAsync_Success_IssuesTokenAndWritesAudit), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);

        var user = new User { TenantId = tenant.Id, UserName = "alice", Email = "alice@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");
        await db.SaveChangesAsync();

        SetHttpContext(httpContextAccessor, "10.0.0.1", "xunit-agent");

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.LoginAsync(new LoginRequest
        {
            TenantCode = "vx",
            UserNameOrEmail = "alice",
            Password = "Password1!"
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal("fake-access", result.Value!.AccessToken);
        Assert.Equal("10.0.0.1", tokenService.LastIpAddress);
        Assert.Equal("xunit-agent", tokenService.LastUserAgent);
        Assert.Equal("auth.login", auditLogger.LastEventType);

        var reloaded = await userManager.FindByIdAsync(user.Id.ToString());
        Assert.NotNull(reloaded!.LastLoginAtUtc);
    }

    [Fact]
    public async Task RefreshAsync_InvalidRefreshToken_Returns401()
    {
        using var scope = BuildScope(nameof(RefreshAsync_InvalidRefreshToken_Returns401), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        tokenService.RefreshResult = null;

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.RefreshAsync(new RefreshTokenRequest { RefreshToken = "invalid" });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status401Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task RefreshAsync_Success_ReturnsTokenPair()
    {
        using var scope = BuildScope(nameof(RefreshAsync_Success_ReturnsTokenPair), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        tokenService.RefreshResult = new LoginResponse { AccessToken = "refreshed-access", RefreshToken = "refreshed-refresh" };
        SetHttpContext(httpContextAccessor, "20.0.0.1", "agent-refresh");

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.RefreshAsync(new RefreshTokenRequest { RefreshToken = "existing" });

        Assert.True(result.Succeeded);
        Assert.Equal("refreshed-access", result.Value!.AccessToken);
        Assert.Equal("20.0.0.1", tokenService.LastIpAddress);
        Assert.Equal("agent-refresh", tokenService.LastUserAgent);
    }

    [Fact]
    public async Task GetCurrentUserAsync_NotAuthenticated_Returns401()
    {
        using var scope = BuildScope(nameof(GetCurrentUserAsync_NotAuthenticated_Returns401), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.GetCurrentUserAsync(new ClaimsPrincipal(new ClaimsIdentity()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status401Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ReturnsRolesAndDistinctSortedPermissions()
    {
        using var scope = BuildScope(nameof(GetCurrentUserAsync_ReturnsRolesAndDistinctSortedPermissions), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        await IdentityTestHelper.SeedRolesAsync(scope);

        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);
        db.Companies.Add(new Company { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Vexorion HQ", Code = "HQ", CurrencyCode = "IDR", IsActive = true });

        var user = new User { TenantId = tenant.Id, UserName = "bob", Email = "bob@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");
        await userManager.AddToRoleAsync(user, AppRoles.Staff);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(AppClaimTypes.Permission, "reports.view"),
            new Claim(AppClaimTypes.Permission, "users.view"),
            new Claim(AppClaimTypes.Permission, "reports.view")
        ], "Test"));

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.GetCurrentUserAsync(principal);

        Assert.True(result.Succeeded);
        Assert.Equal("bob", result.Value!.UserName);
        Assert.Equal("IDR", result.Value.CurrencyCode);
        Assert.Contains(AppRoles.Staff, result.Value.Roles);
        Assert.Equal(new[] { "reports.view", "users.view" }, result.Value.Permissions);
    }

    [Fact]
    public async Task GetCurrentUserAsync_WhenCompanyMissing_UsesUsdFallback()
    {
        using var scope = BuildScope(nameof(GetCurrentUserAsync_WhenCompanyMissing_UsesUsdFallback), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        await IdentityTestHelper.SeedRolesAsync(scope);

        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);

        var user = new User { TenantId = tenant.Id, UserName = "dina", Email = "dina@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        ], "Test"));

        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);
        var result = await service.GetCurrentUserAsync(principal);

        Assert.True(result.Succeeded);
        Assert.Equal("USD", result.Value!.CurrencyCode);
    }

    [Fact]
    public async Task LogoutRefreshAsync_NotAuthenticated_Returns401()
    {
        using var scope = BuildScope(nameof(LogoutRefreshAsync_NotAuthenticated_Returns401), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.LogoutRefreshAsync(new ClaimsPrincipal(new ClaimsIdentity()), new RefreshTokenRequest { RefreshToken = "x" });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status401Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task LogoutRefreshAsync_Success_RevokesTokenAndWritesAudit()
    {
        using var scope = BuildScope(nameof(LogoutRefreshAsync_Success_RevokesTokenAndWritesAudit), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);

        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);
        var user = new User { TenantId = tenant.Id, UserName = "eve", Email = "eve@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");

        SetHttpContext(httpContextAccessor, "30.0.0.1", "logout-agent");

        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.LogoutRefreshAsync(principal, new RefreshTokenRequest { RefreshToken = "refresh-1" });

        Assert.True(result.Succeeded);
        Assert.Equal("refresh-1", tokenService.LastRevokedRefreshToken);
        Assert.Equal("30.0.0.1", tokenService.LastIpAddress);
        Assert.Equal("auth.logout", auditLogger.LastEventType);
    }

    [Fact]
    public async Task RevokeSessionsAsync_NotAuthenticated_Returns401()
    {
        using var scope = BuildScope(nameof(RevokeSessionsAsync_NotAuthenticated_Returns401), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.RevokeSessionsAsync(new ClaimsPrincipal(new ClaimsIdentity()));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status401Unauthorized, result.StatusCode);
    }

    [Fact]
    public async Task RevokeSessionsAsync_Success_RevokesAllTokensAndWritesAudit()
    {
        using var scope = BuildScope(nameof(RevokeSessionsAsync_Success_RevokesAllTokensAndWritesAudit), out var db, out var userManager, out var signInManager, out var tokenService, out var auditLogger, out var httpContextAccessor);

        var tenant = new Tenant { Id = Guid.NewGuid(), Name = "Vexorion", Code = "VX" };
        db.Tenants.Add(tenant);
        var user = new User { TenantId = tenant.Id, UserName = "john", Email = "john@vx.test", IsActive = true };
        await userManager.CreateAsync(user, "Password1!");

        SetHttpContext(httpContextAccessor, "40.0.0.1", "revoke-agent");

        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], "Test"));
        var service = new AuthApplicationService(db, userManager, signInManager, tokenService, auditLogger, httpContextAccessor);

        var result = await service.RevokeSessionsAsync(principal);

        Assert.True(result.Succeeded);
        Assert.Equal(user.Id, tokenService.LastRevokeAllUserId);
        Assert.Equal(user.TenantId, tokenService.LastRevokeAllTenantId);
        Assert.Equal("40.0.0.1", tokenService.LastIpAddress);
        Assert.Equal("auth.revoke_sessions", auditLogger.LastEventType);
    }

    private static IServiceScope BuildScope(
        string dbName,
        out AppDbContext db,
        out UserManager<User> userManager,
        out SignInManager<User> signInManager,
        out CapturingTokenService tokenService,
        out CapturingAuditLogger auditLogger,
        out IHttpContextAccessor httpContextAccessor)
    {
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

        services.AddHttpContextAccessor();
        services.AddAuthentication();
        services.AddLogging();

        services
            .AddIdentityCore<User>(opts =>
            {
                opts.Password.RequireDigit = false;
                opts.Password.RequireLowercase = false;
                opts.Password.RequireUppercase = false;
                opts.Password.RequireNonAlphanumeric = false;
                opts.Password.RequiredLength = 4;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddSignInManager()
            .AddEntityFrameworkStores<AppDbContext>();

        tokenService = new CapturingTokenService();
        auditLogger = new CapturingAuditLogger();
        services.AddSingleton<ITokenService>(tokenService);
        services.AddSingleton<IAuditLogger>(auditLogger);

        var provider = services.BuildServiceProvider();
        var scope = provider.CreateScope();

        db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        signInManager = scope.ServiceProvider.GetRequiredService<SignInManager<User>>();
        httpContextAccessor = scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>();

        return scope;
    }

    private static void SetHttpContext(IHttpContextAccessor accessor, string ipAddress, string userAgent)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ipAddress);
        context.Request.Headers.UserAgent = userAgent;
        accessor.HttpContext = context;
    }

    private sealed class CapturingAuditLogger : IAuditLogger
    {
        public string? LastEventType { get; private set; }

        public Task LogAsync(
            string eventType,
            Guid? tenantId,
            Guid? actorUserId,
            Guid? targetUserId,
            string? entityName,
            string? entityId,
            string? description,
            object? metadata = null,
            CancellationToken cancellationToken = default)
        {
            LastEventType = eventType;
            return Task.CompletedTask;
        }
    }

    private sealed class CapturingTokenService : ITokenService
    {
        public LoginResponse? RefreshResult { get; set; } = new LoginResponse
        {
            AccessToken = "refreshed-access",
            RefreshToken = "refreshed-refresh",
        };

        public string? LastIpAddress { get; private set; }
        public string? LastUserAgent { get; private set; }
        public string? LastRevokedRefreshToken { get; private set; }
        public Guid LastRevokeAllUserId { get; private set; }
        public Guid LastRevokeAllTenantId { get; private set; }

        public Task<LoginResponse> IssueTokenPairAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
        {
            LastIpAddress = ipAddress;
            LastUserAgent = userAgent;
            return Task.FromResult(new LoginResponse
            {
                AccessToken = "fake-access",
                RefreshToken = "fake-refresh",
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(15),
                RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(7),
            });
        }

        public Task<LoginResponse?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
        {
            LastIpAddress = ipAddress;
            LastUserAgent = userAgent;
            return Task.FromResult(RefreshResult);
        }

        public Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
        {
            LastRevokedRefreshToken = refreshToken;
            LastIpAddress = ipAddress;
            return Task.CompletedTask;
        }

        public Task RevokeAllUserRefreshTokensAsync(Guid userId, Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default)
        {
            LastRevokeAllUserId = userId;
            LastRevokeAllTenantId = tenantId;
            LastIpAddress = ipAddress;
            return Task.CompletedTask;
        }
    }
}
