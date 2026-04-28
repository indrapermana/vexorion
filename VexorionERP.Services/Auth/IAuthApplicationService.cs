using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IAuthApplicationService
{
    Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<LoginResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<CurrentUserResponse>> GetCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    ServiceResult<PermissionListResponse> GetPermissions(ClaimsPrincipal principal);
    Task<ServiceResult<bool>> LogoutRefreshAsync(ClaimsPrincipal principal, RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> RevokeSessionsAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
