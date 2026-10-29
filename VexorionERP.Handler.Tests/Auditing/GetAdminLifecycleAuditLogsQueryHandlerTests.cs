using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Handler.Tests.Auditing;

public sealed class GetAdminLifecycleAuditLogsQueryHandlerTests
{
    [Fact]
    public async Task Handle_FiltersLifecycleHistoryByTenantAndTargetUser()
    {
        var tenant = new Tenant { Name = "Tenant", Code = "TENANT" };
        var otherTenant = new Tenant { Name = "Other", Code = "OTHER" };
        var userId = Guid.NewGuid();
        using var services = CreateServices();
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.AddRange(tenant, otherTenant);
        dbContext.AuditLogs.AddRange(
            new AuditLog { TenantId = tenant.Id, TargetUserId = userId, EventType = "users.status_changed", Description = "Included" },
            new AuditLog { TenantId = tenant.Id, TargetUserId = Guid.NewGuid(), EventType = "users.status_changed", Description = "Other user" },
            new AuditLog { TenantId = tenant.Id, TargetUserId = userId, EventType = "products.updated", Description = "Non-lifecycle" },
            new AuditLog { TenantId = otherTenant.Id, TargetUserId = userId, EventType = "users.status_changed", Description = "Other tenant" });
        await dbContext.SaveChangesAsync();

        var result = await new GetAdminLifecycleAuditLogsQueryHandler(services).Handle(
            new GetAdminLifecycleAuditLogsQuery(tenant.Id, userId, false, 1, 50),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        var item = Assert.Single(result.Value!.Items);
        Assert.Equal("Included", item.Description);
    }

    [Fact]
    public async Task Handle_TenantOnly_ReturnsTenantLifecycleEvents()
    {
        var tenant = new Tenant { Name = "Tenant", Code = "TENANT" };
        using var services = CreateServices();
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.Add(tenant);
        dbContext.AuditLogs.AddRange(
            new AuditLog { TenantId = tenant.Id, EventType = "tenants.status_changed" },
            new AuditLog { TenantId = tenant.Id, EventType = "users.create" });
        await dbContext.SaveChangesAsync();

        var result = await new GetAdminLifecycleAuditLogsQueryHandler(services).Handle(
            new GetAdminLifecycleAuditLogsQuery(tenant.Id, null, true, 1, 20),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("tenants.status_changed", Assert.Single(result.Value!.Items).EventType);
    }

    private static ServiceProvider CreateServices()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ServiceCollection()
            .AddSingleton(new AppDbContext(options))
            .BuildServiceProvider();
    }
}
