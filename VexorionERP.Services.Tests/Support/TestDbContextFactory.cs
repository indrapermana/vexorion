using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;

namespace VexorionERP.Services.Tests.Support;

internal static class TestDbContextFactory
{
    public static AppDbContext Create(Guid tenantId, string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new AppDbContext(options, new FixedTenantProvider(tenantId));
    }
}