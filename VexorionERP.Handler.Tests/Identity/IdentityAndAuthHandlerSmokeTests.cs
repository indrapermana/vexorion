using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Identity;

public class IdentityAndAuthHandlerSmokeTests
{
    [Fact]
    public async Task LoginCommandHandler_ForwardsRequest()
    {
        var request = new LoginRequest { TenantCode = "VX", UserNameOrEmail = "admin@vx.test", Password = "Password123!" };
        var authService = new FakeAuthApplicationService
        {
            LoginResult = ServiceResult<LoginResponse>.Success(new LoginResponse { AccessToken = "token" }),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new LoginCommandHandler(serviceProvider);

        var result = await handler.Handle(new LoginCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("token", result.Value!.AccessToken);
        Assert.Same(request, authService.LastLoginRequest);
    }

    [Fact]
    public async Task RefreshTokenCommandHandler_ForwardsRequest()
    {
        var request = new RefreshTokenRequest { RefreshToken = "abcdefghijklmnopqrstuvwxyz012345" };
        var authService = new FakeAuthApplicationService
        {
            RefreshResult = ServiceResult<LoginResponse>.Success(new LoginResponse { AccessToken = "refreshed" }),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new RefreshTokenCommandHandler(serviceProvider);

        var result = await handler.Handle(new RefreshTokenCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("refreshed", result.Value!.AccessToken);
        Assert.Same(request, authService.LastRefreshRequest);
    }

    [Fact]
    public async Task GetCurrentUserQueryHandler_UsesHttpContextPrincipal()
    {
        var authService = new FakeAuthApplicationService
        {
            CurrentUserResult = ServiceResult<CurrentUserResponse>.Success(new CurrentUserResponse { UserName = "indra" }),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new GetCurrentUserQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("indra", result.Value!.UserName);
        Assert.NotNull(authService.LastPrincipal);
        Assert.True(authService.LastPrincipal!.Identity!.IsAuthenticated);
    }

    [Fact]
    public async Task GetPermissionsQueryHandler_UsesHttpContextPrincipal()
    {
        var authService = new FakeAuthApplicationService
        {
            PermissionsResult = ServiceResult<PermissionListResponse>.Success(new PermissionListResponse
            {
                Permissions = ["reports.read"],
            }),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new GetPermissionsQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetPermissionsQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Contains("reports.read", result.Value!.Permissions);
        Assert.NotNull(authService.LastPrincipal);
    }

    [Fact]
    public async Task LogoutRefreshCommandHandler_ForwardsPrincipalAndRequest()
    {
        var request = new RefreshTokenRequest { RefreshToken = "abcdefghijklmnopqrstuvwxyz012345" };
        var authService = new FakeAuthApplicationService
        {
            LogoutRefreshResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new LogoutRefreshCommandHandler(serviceProvider);

        var result = await handler.Handle(new LogoutRefreshCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.NotNull(authService.LastPrincipal);
        Assert.Same(request, authService.LastLogoutRefreshRequest);
    }

    [Fact]
    public async Task RevokeSessionsCommandHandler_ForwardsPrincipal()
    {
        var authService = new FakeAuthApplicationService
        {
            RevokeSessionsResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(authService: authService);
        var handler = new RevokeSessionsCommandHandler(serviceProvider);

        var result = await handler.Handle(new RevokeSessionsCommand(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.NotNull(authService.LastPrincipal);
    }

    [Fact]
    public async Task GetUsersQueryHandler_ForwardsRequest()
    {
        var userService = new FakeUserManagementService
        {
            GetAllResult = ServiceResult<IReadOnlyCollection<UserListItemResponse>>.Success([
                new UserListItemResponse { Id = Guid.NewGuid(), UserName = "user1" },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(userService: userService);
        var handler = new GetUsersQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetUsersQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task CreateUserCommandHandler_ForwardsPrincipalAndRequest()
    {
        var request = new CreateUserRequest
        {
            UserName = "newuser",
            Email = "newuser@vx.test",
            Password = "Password123!",
        };
        var userService = new FakeUserManagementService
        {
            CreateResult = ServiceResult<UserListItemResponse>.Success(new UserListItemResponse
            {
                Id = Guid.NewGuid(),
                UserName = "newuser",
            }),
        };

        using var serviceProvider = BuildServiceProvider(userService: userService);
        var handler = new CreateUserCommandHandler(serviceProvider);

        var result = await handler.Handle(new CreateUserCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("newuser", result.Value!.UserName);
        Assert.Same(request, userService.LastCreateRequest);
        Assert.NotNull(userService.LastPrincipal);
    }

    [Fact]
    public async Task SetUserStatusCommandHandler_ForwardsAllParameters()
    {
        var userId = Guid.NewGuid();
        var request = new DisableUserRequest { IsActive = false };
        var userService = new FakeUserManagementService
        {
            SetStatusResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(userService: userService);
        var handler = new SetUserStatusCommandHandler(serviceProvider);

        var result = await handler.Handle(new SetUserStatusCommand(userId, request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(userId, userService.LastUserId);
        Assert.Same(request, userService.LastDisableRequest);
        Assert.NotNull(userService.LastPrincipal);
    }

    [Fact]
    public async Task ResetUserPasswordCommandHandler_ForwardsAllParameters()
    {
        var userId = Guid.NewGuid();
        var request = new ResetPasswordRequest { NewPassword = "Password456!" };
        var userService = new FakeUserManagementService
        {
            ResetPasswordResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(userService: userService);
        var handler = new ResetUserPasswordCommandHandler(serviceProvider);

        var result = await handler.Handle(new ResetUserPasswordCommand(userId, request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(userId, userService.LastUserId);
        Assert.Same(request, userService.LastResetPasswordRequest);
        Assert.NotNull(userService.LastPrincipal);
    }

    [Fact]
    public async Task UnlockUserCommandHandler_ForwardsAllParameters()
    {
        var userId = Guid.NewGuid();
        var userService = new FakeUserManagementService
        {
            UnlockResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(userService: userService);
        var handler = new UnlockUserCommandHandler(serviceProvider);

        var result = await handler.Handle(new UnlockUserCommand(userId), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(userId, userService.LastUserId);
        Assert.NotNull(userService.LastPrincipal);
    }

    [Fact]
    public async Task GetRolePermissionsQueryHandler_ForwardsRequest()
    {
        var roleService = new FakeRoleManagementService
        {
            GetRolePermissionsResult = ServiceResult<IReadOnlyCollection<RolePermissionsResponse>>.Success([
                new RolePermissionsResponse { Role = "Admin", Permissions = ["users.manage"] },
            ]),
        };

        using var serviceProvider = BuildServiceProvider(roleService: roleService);
        var handler = new GetRolePermissionsQueryHandler(serviceProvider);

        var result = await handler.Handle(new GetRolePermissionsQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task AssignUserRolesCommandHandler_ForwardsAllParameters()
    {
        var userId = Guid.NewGuid();
        var request = new AssignUserRolesRequest { Roles = ["Admin"] };
        var roleService = new FakeRoleManagementService
        {
            AssignRolesResult = ServiceResult<bool>.Success(true),
        };

        using var serviceProvider = BuildServiceProvider(roleService: roleService);
        var handler = new AssignUserRolesCommandHandler(serviceProvider);

        var result = await handler.Handle(new AssignUserRolesCommand(userId, request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
        Assert.Equal(userId, roleService.LastUserId);
        Assert.Same(request, roleService.LastAssignRolesRequest);
        Assert.NotNull(roleService.LastPrincipal);
    }

    [Fact]
    public async Task OnboardTenantCommandHandler_ForwardsAllParameters()
    {
        var request = new OnboardTenantRequest
        {
            TenantName = "Vexorion",
            TenantCode = "VX",
            CompanyName = "Vexorion Ltd",
            CompanyCode = "VXL",
            AdminUserName = "admin",
            AdminEmail = "admin@vx.test",
            AdminPassword = "Password123!",
            FirstName = "Admin",
            LastName = "User",
        };

        var tenantService = new FakeTenantOnboardingService
        {
            OnboardResult = ServiceResult<OnboardTenantResponse>.Success(new OnboardTenantResponse
            {
                TenantId = Guid.NewGuid(),
                CompanyId = Guid.NewGuid(),
                AdminUserId = Guid.NewGuid(),
                TenantCode = "VX",
                AdminUserName = "admin",
            }),
        };

        using var serviceProvider = BuildServiceProvider(tenantService: tenantService);
        var handler = new OnboardTenantCommandHandler(serviceProvider);

        var result = await handler.Handle(new OnboardTenantCommand(request), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("VX", result.Value!.TenantCode);
        Assert.Same(request, tenantService.LastRequest);
        Assert.NotNull(tenantService.LastPrincipal);
    }

    private static ServiceProvider BuildServiceProvider(
        FakeAuthApplicationService? authService = null,
        FakeUserManagementService? userService = null,
        FakeRoleManagementService? roleService = null,
        FakeTenantOnboardingService? tenantService = null)
    {
        var services = new ServiceCollection();

        if (authService is not null)
            services.AddSingleton<IAuthApplicationService>(authService);

        if (userService is not null)
            services.AddSingleton<IUserManagementService>(userService);

        if (roleService is not null)
            services.AddSingleton<IRoleManagementService>(roleService);

        if (tenantService is not null)
            services.AddSingleton<ITenantOnboardingService>(tenantService);

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, "test-user"),
        ],
        authenticationType: "Test");

        var context = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        services.AddSingleton<IHttpContextAccessor>(new HttpContextAccessor { HttpContext = context });

        return services.BuildServiceProvider();
    }

    private sealed class FakeAuthApplicationService : IAuthApplicationService
    {
        public ServiceResult<LoginResponse> LoginResult { get; set; } = ServiceResult<LoginResponse>.Success(new LoginResponse());
        public ServiceResult<LoginResponse> RefreshResult { get; set; } = ServiceResult<LoginResponse>.Success(new LoginResponse());
        public ServiceResult<CurrentUserResponse> CurrentUserResult { get; set; } = ServiceResult<CurrentUserResponse>.Success(new CurrentUserResponse());
        public ServiceResult<PermissionListResponse> PermissionsResult { get; set; } = ServiceResult<PermissionListResponse>.Success(new PermissionListResponse());
        public ServiceResult<bool> LogoutRefreshResult { get; set; } = ServiceResult<bool>.Success(true);
        public ServiceResult<bool> RevokeSessionsResult { get; set; } = ServiceResult<bool>.Success(true);

        public LoginRequest? LastLoginRequest { get; private set; }
        public RefreshTokenRequest? LastRefreshRequest { get; private set; }
        public RefreshTokenRequest? LastLogoutRefreshRequest { get; private set; }
        public ClaimsPrincipal? LastPrincipal { get; private set; }

        public Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
        {
            LastLoginRequest = request;
            return Task.FromResult(LoginResult);
        }

        public Task<ServiceResult<LoginResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
        {
            LastRefreshRequest = request;
            return Task.FromResult(RefreshResult);
        }

        public Task<ServiceResult<CurrentUserResponse>> GetCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastPrincipal = principal;
            return Task.FromResult(CurrentUserResult);
        }

        public ServiceResult<PermissionListResponse> GetPermissions(ClaimsPrincipal principal)
        {
            LastPrincipal = principal;
            return PermissionsResult;
        }

        public Task<ServiceResult<bool>> LogoutRefreshAsync(ClaimsPrincipal principal, RefreshTokenRequest request, CancellationToken cancellationToken = default)
        {
            LastPrincipal = principal;
            LastLogoutRefreshRequest = request;
            return Task.FromResult(LogoutRefreshResult);
        }

        public Task<ServiceResult<bool>> RevokeSessionsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastPrincipal = principal;
            return Task.FromResult(RevokeSessionsResult);
        }
    }

    private sealed class FakeUserManagementService : IUserManagementService
    {
        public ServiceResult<IReadOnlyCollection<UserListItemResponse>> GetAllResult { get; set; } = ServiceResult<IReadOnlyCollection<UserListItemResponse>>.Success([]);
        public ServiceResult<UserListItemResponse> CreateResult { get; set; } = ServiceResult<UserListItemResponse>.Success(new UserListItemResponse());
        public ServiceResult<bool> SetStatusResult { get; set; } = ServiceResult<bool>.Success(true);
        public ServiceResult<bool> ResetPasswordResult { get; set; } = ServiceResult<bool>.Success(true);
        public ServiceResult<bool> UnlockResult { get; set; } = ServiceResult<bool>.Success(true);

        public Guid LastUserId { get; private set; }
        public ClaimsPrincipal? LastPrincipal { get; private set; }
        public CreateUserRequest? LastCreateRequest { get; private set; }
        public DisableUserRequest? LastDisableRequest { get; private set; }
        public ResetPasswordRequest? LastResetPasswordRequest { get; private set; }

        public Task<ServiceResult<IReadOnlyCollection<UserListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(GetAllResult);
        }

        public Task<ServiceResult<UserListItemResponse>> CreateAsync(CreateUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastCreateRequest = request;
            LastPrincipal = principal;
            return Task.FromResult(CreateResult);
        }

        public Task<ServiceResult<bool>> SetStatusAsync(Guid userId, DisableUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            LastDisableRequest = request;
            LastPrincipal = principal;
            return Task.FromResult(SetStatusResult);
        }

        public Task<ServiceResult<bool>> ResetPasswordAsync(Guid userId, ResetPasswordRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            LastResetPasswordRequest = request;
            LastPrincipal = principal;
            return Task.FromResult(ResetPasswordResult);
        }

        public Task<ServiceResult<bool>> UnlockAsync(Guid userId, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            LastPrincipal = principal;
            return Task.FromResult(UnlockResult);
        }
    }

    private sealed class FakeRoleManagementService : IRoleManagementService
    {
        public ServiceResult<IReadOnlyCollection<RolePermissionsResponse>> GetRolePermissionsResult { get; set; }
            = ServiceResult<IReadOnlyCollection<RolePermissionsResponse>>.Success([]);

        public ServiceResult<bool> AssignRolesResult { get; set; } = ServiceResult<bool>.Success(true);

        public Guid LastUserId { get; private set; }
        public AssignUserRolesRequest? LastAssignRolesRequest { get; private set; }
        public ClaimsPrincipal? LastPrincipal { get; private set; }

        public ServiceResult<IReadOnlyCollection<RolePermissionsResponse>> GetRolePermissions()
        {
            return GetRolePermissionsResult;
        }

        public Task<ServiceResult<bool>> AssignUserRolesAsync(Guid userId, AssignUserRolesRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            LastAssignRolesRequest = request;
            LastPrincipal = principal;
            return Task.FromResult(AssignRolesResult);
        }
    }

    private sealed class FakeTenantOnboardingService : ITenantOnboardingService
    {
        public ServiceResult<OnboardTenantResponse> OnboardResult { get; set; } = ServiceResult<OnboardTenantResponse>.Success(new OnboardTenantResponse());

        public OnboardTenantRequest? LastRequest { get; private set; }
        public ClaimsPrincipal? LastPrincipal { get; private set; }

        public Task<ServiceResult<OnboardTenantResponse>> OnboardAsync(OnboardTenantRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            LastRequest = request;
            LastPrincipal = principal;
            return Task.FromResult(OnboardResult);
        }
    }
}
