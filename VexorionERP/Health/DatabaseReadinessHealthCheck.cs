using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using VexorionERP.Database;

namespace VexorionERP;

public sealed class DatabaseReadinessHealthCheck(
    IServiceScopeFactory scopeFactory,
    ILogger<DatabaseReadinessHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            if (!await dbContext.Database.CanConnectAsync(cancellationToken))
            {
                return HealthCheckResult.Unhealthy("Database readiness check failed.");
            }

            if (dbContext.Database.IsRelational() &&
                (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).Any())
            {
                return HealthCheckResult.Unhealthy("Database schema is not current.");
            }

            return HealthCheckResult.Healthy();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("Database readiness check timed out.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Database readiness health check failed.");
            return HealthCheckResult.Unhealthy("Database readiness check failed.");
        }
    }
}
