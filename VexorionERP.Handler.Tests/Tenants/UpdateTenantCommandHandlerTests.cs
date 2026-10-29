using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Tenants;

public sealed class UpdateTenantCommandHandlerTests
{
    [Fact]
    public async Task Handle_SuspendingTenant_RevokesRefreshSessionsAndAuditsTransition()
    {
        var tenant = new Tenant { Name = "Active", Code = "ACTIVE", IsActive = true };
        var tokenService = new CapturingTokenService();
        var auditLogger = new CapturingAuditLogger();
        using var services = CreateServices(tokenService, auditLogger);
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.Add(tenant);
        await dbContext.SaveChangesAsync();
        var actorUserId = Guid.NewGuid();

        var result = await new UpdateTenantCommandHandler(services).Handle(
            new UpdateTenantCommand(tenant.Id, new UpdateTenantRequest { Name = tenant.Name, Domain = tenant.Domain, IsActive = false }, actorUserId),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.False((await dbContext.Tenants.FindAsync(tenant.Id))!.IsActive);
        Assert.Equal(tenant.Id, tokenService.RevokedTenantId);
        Assert.Equal("tenants.status_changed", auditLogger.EventType);
        Assert.Equal(actorUserId, auditLogger.ActorUserId);
    }

    [Fact]
    public async Task Handle_ReactivatingTenant_DoesNotRestoreOrCreateSessions()
    {
        var tenant = new Tenant { Name = "Suspended", Code = "SUSP", IsActive = false };
        var tokenService = new CapturingTokenService();
        var auditLogger = new CapturingAuditLogger();
        using var services = CreateServices(tokenService, auditLogger);
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.Add(tenant);
        await dbContext.SaveChangesAsync();

        var result = await new UpdateTenantCommandHandler(services).Handle(
            new UpdateTenantCommand(tenant.Id, new UpdateTenantRequest { Name = tenant.Name, Domain = null, IsActive = true }, Guid.NewGuid()),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Null(tokenService.RevokedTenantId);
        Assert.Equal("tenants.status_changed", auditLogger.EventType);
    }

    private static ServiceProvider CreateServices(ITokenService tokenService, IAuditLogger auditLogger)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ServiceCollection()
            .AddSingleton(new AppDbContext(options))
            .AddSingleton(tokenService)
            .AddSingleton(auditLogger)
            .BuildServiceProvider();
    }

    private sealed class CapturingTokenService : ITokenService
    {
        public Guid? RevokedTenantId { get; private set; }
        public Task<LoginResponse> IssueTokenPairAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<LoginResponse?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task RevokeAllUserRefreshTokensAsync(Guid userId, Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task RevokeAllTenantRefreshTokensAsync(Guid tenantId, string? ipAddress, CancellationToken cancellationToken = default)
        {
            RevokedTenantId = tenantId;
            return Task.CompletedTask;
        }
    }

    private sealed class CapturingAuditLogger : IAuditLogger
    {
        public string? EventType { get; private set; }
        public Guid? ActorUserId { get; private set; }

        public Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId, string? entityName, string? entityId, string? description, object? metadata = null, CancellationToken cancellationToken = default)
        {
            EventType = eventType;
            ActorUserId = actorUserId;
            return Task.CompletedTask;
        }
    }
}
