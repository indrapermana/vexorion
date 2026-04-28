using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class AuthApplicationService(
    AppDbContext dbContext,
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    ITokenService tokenService,
    IAuditLogger auditLogger,
    IHttpContextAccessor httpContextAccessor) : IAuthApplicationService
{
    public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedTenantCode = request.TenantCode.Trim().ToUpperInvariant();
        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(x => x.Code.ToUpper() == normalizedTenantCode, cancellationToken);
        if (tenant is null)
        {
            return ServiceResult<LoginResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request.TenantCode)] = ["Invalid tenant code."]
            });
        }

        var normalizedLookup = request.UserNameOrEmail.Trim().ToUpperInvariant();
        var user = await userManager.Users
            .FirstOrDefaultAsync(x => x.TenantId == tenant.Id && (x.NormalizedUserName == normalizedLookup || x.NormalizedEmail == normalizedLookup), cancellationToken);

        if (user is null || !user.IsActive)
        {
            return ServiceResult<LoginResponse>.Failure(StatusCodes.Status401Unauthorized, "Invalid credentials.");
        }

        var passwordCheck = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!passwordCheck.Succeeded)
        {
            return ServiceResult<LoginResponse>.Failure(StatusCodes.Status401Unauthorized, "Invalid credentials.");
        }

        user.LastLoginAtUtc = DateTimeOffset.UtcNow;
        await userManager.UpdateAsync(user);

        var response = await tokenService.IssueTokenPairAsync(user, GetIpAddress(), GetUserAgent(), cancellationToken);
        await auditLogger.LogAsync("auth.login", user.TenantId, user.Id, user.Id, nameof(User), user.Id.ToString(), "User logged in.", new { request.TenantCode }, cancellationToken);
        return ServiceResult<LoginResponse>.Success(response);
    }

    public async Task<ServiceResult<LoginResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var response = await tokenService.RefreshAsync(request.RefreshToken, GetIpAddress(), GetUserAgent(), cancellationToken);
        return response is null
            ? ServiceResult<LoginResponse>.Failure(StatusCodes.Status401Unauthorized, "Invalid refresh token.")
            : ServiceResult<LoginResponse>.Success(response);
    }

    public async Task<ServiceResult<CurrentUserResponse>> GetCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return ServiceResult<CurrentUserResponse>.Failure(StatusCodes.Status401Unauthorized, "User is not authenticated.");
        }

        var roles = await userManager.GetRolesAsync(user);
        var permissions = principal.Claims
            .Where(x => x.Type == AppClaimTypes.Permission)
            .Select(x => x.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToArray();

        return ServiceResult<CurrentUserResponse>.Success(new CurrentUserResponse
        {
            Id = user.Id,
            TenantId = user.TenantId,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles.ToArray(),
            Permissions = permissions
        });
    }

    public ServiceResult<PermissionListResponse> GetPermissions(ClaimsPrincipal principal)
    {
        var permissions = principal.Claims
            .Where(x => x.Type == AppClaimTypes.Permission)
            .Select(x => x.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x)
            .ToArray();

        return ServiceResult<PermissionListResponse>.Success(new PermissionListResponse
        {
            Permissions = permissions
        });
    }

    public async Task<ServiceResult<bool>> LogoutRefreshAsync(ClaimsPrincipal principal, RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status401Unauthorized, "User is not authenticated.");
        }

        await tokenService.RevokeRefreshTokenAsync(request.RefreshToken, GetIpAddress(), cancellationToken);
        await auditLogger.LogAsync("auth.logout", user.TenantId, user.Id, user.Id, nameof(User), user.Id.ToString(), "Refresh token revoked for logout.", cancellationToken: cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> RevokeSessionsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status401Unauthorized, "User is not authenticated.");
        }

        var result = await userManager.UpdateSecurityStampAsync(user);
        if (!result.Succeeded)
        {
            return ServiceResult<bool>.ValidationFailure(result.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        await tokenService.RevokeAllUserRefreshTokensAsync(user.Id, user.TenantId, GetIpAddress(), cancellationToken);
        await auditLogger.LogAsync("auth.revoke_sessions", user.TenantId, user.Id, user.Id, nameof(User), user.Id.ToString(), "All sessions revoked.", cancellationToken: cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private string? GetIpAddress() => httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() => httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
}
