using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface ITokenService
{
    Task<LoginResponse> IssueTokenPairAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<LoginResponse?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task RevokeAllUserRefreshTokensAsync(Guid userId, Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default);
    Task RevokeAllTenantRefreshTokensAsync(Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default);
}
