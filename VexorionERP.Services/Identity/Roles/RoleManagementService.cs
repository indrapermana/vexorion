using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class RoleManagementService(
    UserManager<User> userManager,
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger) : IRoleManagementService
{
    public ServiceResult<IReadOnlyCollection<RolePermissionsResponse>> GetRolePermissions()
    {
        var response = RolePermissionMatrix.All
            .Select(pair => new RolePermissionsResponse
            {
                Role = pair.Key,
                Permissions = pair.Value.ToArray()
            })
            .OrderBy(x => x.Role)
            .ToArray();

        return ServiceResult<IReadOnlyCollection<RolePermissionsResponse>>.Success(response);
    }

    public async Task<ServiceResult<bool>> AssignUserRolesAsync(Guid userId, AssignUserRolesRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invalidRoles = request.Roles.Except(AppRoles.All).ToArray();
        if (invalidRoles.Length > 0)
        {
            return ServiceResult<bool>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request.Roles)] = [$"Unknown roles: {string.Join(", ", invalidRoles)}"]
            });
        }

        var user = await userManager.Users
            .FirstOrDefaultAsync(x => x.Id == userId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        if (user is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "User not found.");
        }

        var existingRoles = await userManager.GetRolesAsync(user);
        var rolesToRemove = existingRoles.Except(request.Roles).ToArray();
        var rolesToAdd = request.Roles.Except(existingRoles).ToArray();

        if (rolesToRemove.Length > 0)
        {
            var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                return ServiceResult<bool>.ValidationFailure(removeResult.Errors
                    .GroupBy(x => x.Code)
                    .ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
            }
        }

        if (rolesToAdd.Length > 0)
        {
            var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                return ServiceResult<bool>.ValidationFailure(addResult.Errors
                    .GroupBy(x => x.Code)
                    .ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
            }
        }

        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync(
            "roles.assigned",
            currentTenantProvider.TenantId,
            actorUserId is null ? null : Guid.Parse(actorUserId),
            user.Id,
            nameof(User),
            user.Id.ToString(),
            "User roles updated.",
            new { roles = request.Roles },
            cancellationToken);

        return ServiceResult<bool>.Success(true);
    }
}
