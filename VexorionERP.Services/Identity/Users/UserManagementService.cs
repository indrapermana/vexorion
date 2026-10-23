using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class UserManagementService(
    UserManager<User> userManager,
    ICurrentTenantProvider currentTenantProvider,
    ITokenService tokenService,
    IAuditLogger auditLogger) : IUserManagementService
{
    public async Task<ServiceResult<IReadOnlyCollection<UserListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<UserListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var users = await userManager.Users
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value)
            .OrderBy(x => x.UserName)
            .ToListAsync(cancellationToken);

        var results = new List<UserListItemResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            results.Add(new UserListItemResponse
            {
                Id = user.Id,
                TenantId = user.TenantId,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = roles.ToArray()
            });
        }

        return ServiceResult<IReadOnlyCollection<UserListItemResponse>>.Success(results);
    }

    public async Task<ServiceResult<UserListItemResponse>> CreateAsync(CreateUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<UserListItemResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var disallowedRoles = request.Roles.Except(AppRoles.All).ToArray();
        if (disallowedRoles.Length > 0)
        {
            return ServiceResult<UserListItemResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request.Roles)] = [$"Unknown roles: {string.Join(", ", disallowedRoles)}"]
            });
        }

        var user = new User
        {
            TenantId = currentTenantProvider.TenantId.Value,
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            FirstName = string.IsNullOrWhiteSpace(request.FirstName) ? null : request.FirstName.Trim(),
            LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim(),
            EmployeeId = request.EmployeeId,
            IsActive = true,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return ServiceResult<UserListItemResponse>.ValidationFailure(IdentityErrorFieldMapper.ToFieldErrors(createResult.Errors, nameof(request.Password), nameof(request.UserName), nameof(request.Email)));
        }

        if (request.Roles.Count > 0)
        {
            var roleResult = await userManager.AddToRolesAsync(user, request.Roles);
            if (!roleResult.Succeeded)
            {
                return ServiceResult<UserListItemResponse>.ValidationFailure(roleResult.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
            }
        }

        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync("users.create", user.TenantId, actorUserId is null ? null : Guid.Parse(actorUserId), user.Id, nameof(User), user.Id.ToString(), "User created.", new { request.Roles }, cancellationToken: cancellationToken);

        var roles = await userManager.GetRolesAsync(user);
        return ServiceResult<UserListItemResponse>.Success(new UserListItemResponse
        {
            Id = user.Id,
            TenantId = user.TenantId,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            Roles = roles.ToArray()
        });
    }

    public async Task<ServiceResult<bool>> SetStatusAsync(Guid userId, DisableUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await GetManagedUserAsync(userId, principal, cancellationToken);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "User not found.");
        }

        user.IsActive = request.IsActive;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return ServiceResult<bool>.ValidationFailure(result.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        if (!request.IsActive)
        {
            await tokenService.RevokeAllUserRefreshTokensAsync(user.Id, user.TenantId, null, cancellationToken);
        }

        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync("users.status_changed", user.TenantId, actorUserId is null ? null : Guid.Parse(actorUserId), user.Id, nameof(User), user.Id.ToString(), request.IsActive ? "User enabled." : "User disabled.", new { request.IsActive }, cancellationToken: cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> ResetPasswordAsync(Guid userId, ResetPasswordRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await GetManagedUserAsync(userId, principal, cancellationToken);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "User not found.");
        }

        var removeResult = await userManager.RemovePasswordAsync(user);
        if (!removeResult.Succeeded && user.PasswordHash is not null)
        {
            return ServiceResult<bool>.ValidationFailure(removeResult.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        var addResult = await userManager.AddPasswordAsync(user, request.NewPassword);
        if (!addResult.Succeeded)
        {
            return ServiceResult<bool>.ValidationFailure(addResult.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        await tokenService.RevokeAllUserRefreshTokensAsync(user.Id, user.TenantId, null, cancellationToken);
        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync("users.password_reset", user.TenantId, actorUserId is null ? null : Guid.Parse(actorUserId), user.Id, nameof(User), user.Id.ToString(), "User password reset.", cancellationToken: cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<bool>> UnlockAsync(Guid userId, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var user = await GetManagedUserAsync(userId, principal, cancellationToken);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "User not found.");
        }

        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return ServiceResult<bool>.ValidationFailure(result.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync("users.unlocked", user.TenantId, actorUserId is null ? null : Guid.Parse(actorUserId), user.Id, nameof(User), user.Id.ToString(), "User unlocked.", cancellationToken: cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private async Task<User?> GetManagedUserAsync(Guid userId, ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        if (principal.IsInRole(AppRoles.SystemAdmin))
        {
            return await userManager.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        }

        if (!currentTenantProvider.TenantId.HasValue)
        {
            return null;
        }

        return await userManager.Users.FirstOrDefaultAsync(x => x.Id == userId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
    }
}
