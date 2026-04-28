using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IRoleManagementService
{
    ServiceResult<IReadOnlyCollection<RolePermissionsResponse>> GetRolePermissions();
    Task<ServiceResult<bool>> AssignUserRolesAsync(Guid userId, AssignUserRolesRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
