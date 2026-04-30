using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

internal static class IdentityTestHelper
{
    private static IServiceProvider BuildProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        services
            .AddIdentityCore<User>(opts =>
            {
                // Relax password rules for test data
                opts.Password.RequireDigit = false;
                opts.Password.RequireLowercase = false;
                opts.Password.RequireUppercase = false;
                opts.Password.RequireNonAlphanumeric = false;
                opts.Password.RequiredLength = 4;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>();
        services.AddLogging();
        return services.BuildServiceProvider();
    }

    /// <summary>
    /// Creates a real UserManager backed by an in-memory EF Core store.
    /// The AppDbContext used by the store has no tenant filter (no ICurrentTenantProvider),
    /// allowing UserManager to see all users regardless of tenant.
    /// </summary>
    public static (UserManager<User> userManager, IServiceProvider provider) CreateUserManager(string dbName)
    {
        var provider = BuildProvider(dbName);
        var userManager = provider.GetRequiredService<UserManager<User>>();
        return (userManager, provider);
    }

    /// <summary>
    /// Returns a scoped AppDbContext and UserManager that share the same DbContext instance.
    /// Useful when the service under test receives both a dbContext and userManager parameter.
    /// Callers must dispose the returned IServiceScope when done.
    /// </summary>
    public static (AppDbContext dbContext, UserManager<User> userManager, IServiceScope scope) CreateScopedServices(string dbName)
    {
        var provider = BuildProvider(dbName);
        var scope = provider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        return (dbContext, userManager, scope);
    }

    /// <summary>
    /// Seeds roles expected by AppRoles into the RoleManager so that
    /// AddToRolesAsync succeeds.
    /// </summary>
    public static async Task SeedRolesAsync(IServiceProvider provider)
    {
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
    }

    /// <summary>Variant that takes an IServiceScope instead of IServiceProvider.</summary>
    public static async Task SeedRolesAsync(IServiceScope scope) =>
        await SeedRolesAsync(scope.ServiceProvider);
}
