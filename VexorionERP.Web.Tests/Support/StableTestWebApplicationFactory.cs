using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace VexorionERP.Web.Tests;

public sealed class StableTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    private readonly string _databaseName = $"vexorion-web-tests-stable-{Guid.NewGuid()}";
    private readonly InMemoryDatabaseRoot _databaseRoot = new();

    protected override string GetDatabaseName() => _databaseName;

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        // Override the DbContext configuration to use the shared in-memory database root
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName, _databaseRoot);
            });
        });
    }
}
