using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;

namespace VexorionERP;

public sealed class ApplicationRuntimeValidator(AppDbContext dbContext) : IApplicationRuntimeValidator
{
    public async Task ValidateAsync(CancellationToken cancellationToken = default)
    {
        if (!dbContext.Database.IsRelational())
        {
            return;
        }

        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException(
                "The application database is unavailable. Verify ConnectionStrings:DefaultConnection and network access.");
        }

        var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
        if (pendingMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"The application database schema is not current. Run --vexorion-operation=migrate before starting the API. Pending migrations: {string.Join(", ", pendingMigrations)}.");
        }
    }
}
