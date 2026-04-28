using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IUserManagementService
{
    Task<ServiceResult<IReadOnlyCollection<UserListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<UserListItemResponse>> CreateAsync(CreateUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> SetStatusAsync(Guid userId, DisableUserRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> ResetPasswordAsync(Guid userId, ResetPasswordRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> UnlockAsync(Guid userId, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
