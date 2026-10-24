using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class TenantPreferencesHandlerTests
{
    [Fact]
    public async Task Get_WhenMissing_ReturnsDefaultsWithoutSavingOrTrackingAnInsert()
    {
        using var services = CreateServices(Guid.NewGuid());
        var dbContext = services.GetRequiredService<AppDbContext>();
        var handler = new GetTenantPreferencesQueryHandler(services);

        var result = await handler.Handle(new GetTenantPreferencesQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Empty(result.Value.HiddenMenuLinks);
        Assert.Equal(25m, result.Value.MaxManualDiscountPercent);
        Assert.Empty(await dbContext.TenantPreferences.ToListAsync());
        Assert.Empty(dbContext.ChangeTracker.Entries());
    }

    [Fact]
    public async Task Update_AfterReadingDefaults_PersistsPreferencesAndSubsequentReadsReturnThem()
    {
        using var services = CreateServices(Guid.NewGuid());
        var dbContext = services.GetRequiredService<AppDbContext>();
        var readHandler = new GetTenantPreferencesQueryHandler(services);
        await readHandler.Handle(new GetTenantPreferencesQuery(), CancellationToken.None);
        var writeHandler = new UpdateTenantMenuConfigurationCommandHandler(services);

        var result = await writeHandler.Handle(new UpdateTenantMenuConfigurationCommand(new UpdateMenuConfigurationRequest
        {
            HiddenMenuLinks = ["/customers", "/project-documents"],
        }), CancellationToken.None);
        var reloaded = await readHandler.Handle(new GetTenantPreferencesQuery(), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(reloaded.Succeeded);
        Assert.Equal(["/customers", "/project-documents"], reloaded.Value!.HiddenMenuLinks);
        Assert.Single(await dbContext.TenantPreferences.ToListAsync());
    }

    [Fact]
    public async Task Get_WithoutTenant_ReturnsFailureWithoutSaving()
    {
        using var services = CreateServices(null);
        var handler = new GetTenantPreferencesQueryHandler(services);

        var result = await handler.Handle(new GetTenantPreferencesQuery(), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Empty(await services.GetRequiredService<AppDbContext>().TenantPreferences.ToListAsync());
    }

    private static ServiceProvider CreateServices(Guid? tenantId)
    {
        var tenant = new TestTenantProvider(tenantId);
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var services = new ServiceCollection();
        services.AddSingleton<ICurrentTenantProvider>(tenant);
        services.AddSingleton(_ => new AppDbContext(options, tenant));
        return services.BuildServiceProvider();
    }

    private sealed record TestTenantProvider(Guid? TenantId) : ICurrentTenantProvider;
}