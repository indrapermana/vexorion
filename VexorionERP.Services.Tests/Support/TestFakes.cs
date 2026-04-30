using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Services;

internal sealed class NoOpAuditLogger : IAuditLogger
{
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
        => Task.CompletedTask;
}

internal sealed class FakeTokenService : ITokenService
{
    public Task<LoginResponse> IssueTokenPairAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
        => Task.FromResult(new LoginResponse { AccessToken = "fake-access", RefreshToken = "fake-refresh" });

    public Task<LoginResponse?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
        => Task.FromResult<LoginResponse?>(null);

    public Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task RevokeAllUserRefreshTokensAsync(Guid userId, Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
