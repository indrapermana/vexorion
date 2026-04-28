using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VexorionERP.Database;

namespace VexorionERP.Services;

internal static class TestDbContextFactory
{
    public static InMemoryDatabaseRoot CreateRoot() => new InMemoryDatabaseRoot();

    public static AppDbContext Create(Guid tenantId, string databaseName, InMemoryDatabaseRoot? root = null)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        if (root is not null)
            builder.UseInMemoryDatabase(databaseName, root);
        else
            builder.UseInMemoryDatabase(databaseName);
        var options = builder.Options;

        return new AppDbContext(options, new FixedTenantProvider(tenantId));
    }
}
