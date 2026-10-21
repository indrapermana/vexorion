using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests.Tenants;

public sealed class DeleteTenantCommandHandlerTests
{
    [Fact]
    public async Task Handle_WhenStorageCleanupFails_PreservesTenantAndReturnsGatewayError()
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), Code = "e2e-test", Name = "E2E Test" };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var dbContext = new AppDbContext(options);
        dbContext.Tenants.Add(tenant);
        await dbContext.SaveChangesAsync();
        var cleanup = new FailingTenantStorageCleanupService();
        var services = new ServiceCollection()
            .AddSingleton(dbContext)
            .AddSingleton<ITenantStorageCleanupService>(cleanup)
            .BuildServiceProvider();
        var handler = new DeleteTenantCommandHandler(services);

        var result = await handler.Handle(new DeleteTenantCommand(tenant.Id), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Equal(tenant.Id, cleanup.TenantId);
        Assert.True(await dbContext.Tenants.AnyAsync(item => item.Id == tenant.Id));
    }

    private sealed class FailingTenantStorageCleanupService : ITenantStorageCleanupService
    {
        public Guid? TenantId { get; private set; }

        public Task<ServiceResult<bool>> DeleteTenantObjectsAsync(Guid tenantId, CancellationToken cancellationToken = default)
        {
            TenantId = tenantId;
            return Task.FromResult(ServiceResult<bool>.Failure(
                StatusCodes.Status502BadGateway,
                "Stored objects could not be removed."));
        }
    }
}
