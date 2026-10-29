using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class GetTenantModuleEffectiveAccessBatchQueryHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsAllTenantsWithDefaultsAndConfiguredToggles()
    {
        var firstTenant = new Tenant { Name = "Alpha", Code = "ALPHA" };
        var secondTenant = new Tenant { Name = "Beta", Code = "BETA" };
        using var services = CreateServices(currentTenantId: firstTenant.Id);
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.AddRange(firstTenant, secondTenant);
        dbContext.TenantModuleConfigs.Add(new TenantModuleConfig
        {
            TenantId = secondTenant.Id,
            ProjectManagementEnabled = false,
            DocumentManagementEnabled = true,
            EmployeeManagementEnabled = false
        });
        await dbContext.SaveChangesAsync();

        var result = await new GetTenantModuleEffectiveAccessBatchQueryHandler(services)
            .Handle(new GetTenantModuleEffectiveAccessBatchQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.Empty(result.Value.FailedTenantIds);
        var alpha = Assert.Single(result.Value.Items, item => item.TenantId == firstTenant.Id);
        Assert.True(alpha.Project.EffectiveEnabled);
        Assert.True(alpha.Document.EffectiveEnabled);
        Assert.True(alpha.Employee.EffectiveEnabled);
        var beta = Assert.Single(result.Value.Items, item => item.TenantId == secondTenant.Id);
        Assert.False(beta.Project.EffectiveEnabled);
        Assert.True(beta.Document.EffectiveEnabled);
        Assert.False(beta.Employee.EffectiveEnabled);
    }

    [Fact]
    public async Task Handle_AppliesRolloutAllowListAcrossBatch()
    {
        var allowedTenant = new Tenant { Name = "Allowed", Code = " ALLOWED " };
        var blockedTenant = new Tenant { Name = "Blocked", Code = "BLOCKED" };
        var rollout = new TenantModuleRolloutOptions
        {
            Enabled = true,
            Project = new ModuleRolloutAreaOptions
            {
                Enabled = true,
                Mode = "AllowList",
                AllowedTenantCodes = ["allowed"]
            }
        };
        using var services = CreateServices(rollout);
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Tenants.AddRange(allowedTenant, blockedTenant);
        await dbContext.SaveChangesAsync();

        var result = await new GetTenantModuleEffectiveAccessBatchQueryHandler(services)
            .Handle(new GetTenantModuleEffectiveAccessBatchQuery(), CancellationToken.None);

        Assert.True(result.Value!.Items.Single(item => item.TenantId == allowedTenant.Id).Project.EffectiveEnabled);
        Assert.False(result.Value.Items.Single(item => item.TenantId == blockedTenant.Id).Project.EffectiveEnabled);
    }

    private static ServiceProvider CreateServices(TenantModuleRolloutOptions? rollout = null, Guid? currentTenantId = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ServiceCollection()
            .AddSingleton(new AppDbContext(options, new TestTenantProvider(currentTenantId)))
            .AddSingleton<IOptions<TenantModuleRolloutOptions>>(Options.Create(rollout ?? new TenantModuleRolloutOptions()))
            .BuildServiceProvider();
    }

    private sealed record TestTenantProvider(Guid? TenantId) : ICurrentTenantProvider;
}
