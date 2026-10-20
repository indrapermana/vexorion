using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;

namespace VexorionERP;

public enum ApplicationOperation
{
    Run,
    Migrate,
    Bootstrap,
    Provision
}

public static class ApplicationInitializationExtensions
{
    private const string OperationPrefix = "--vexorion-operation=";

    public static ApplicationOperation GetApplicationOperation(this string[] args)
    {
        var values = args
            .Where(argument => argument.StartsWith(OperationPrefix, StringComparison.OrdinalIgnoreCase))
            .ToArray();

        if (values.Length == 0)
        {
            return ApplicationOperation.Run;
        }

        if (values.Length > 1)
        {
            throw new InvalidOperationException("Specify --vexorion-operation only once.");
        }

        return values[0][OperationPrefix.Length..].Trim().ToLowerInvariant() switch
        {
            "migrate" => ApplicationOperation.Migrate,
            "bootstrap" => ApplicationOperation.Bootstrap,
            "provision" => ApplicationOperation.Provision,
            var value => throw new InvalidOperationException(
                $"Unsupported VexorionERP operation '{value}'. Use migrate, bootstrap, or provision.")
        };
    }

    public static void UsePrivilegedConnectionForOperation(
        this ConfigurationManager configuration,
        IHostEnvironment environment,
        ApplicationOperation operation)
    {
        if (operation == ApplicationOperation.Run)
        {
            return;
        }

        var privilegedConnection = configuration.GetConnectionString("MigrationConnection");
        if (string.IsNullOrWhiteSpace(privilegedConnection))
        {
            if (environment.IsProduction())
            {
                throw new InvalidOperationException(
                    "ConnectionStrings:MigrationConnection is required for production provisioning operations.");
            }

            return;
        }

        configuration["ConnectionStrings:DefaultConnection"] = privilegedConnection;
    }

    public static async Task ValidateApplicationRuntimeAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var validator = scope.ServiceProvider.GetRequiredService<IApplicationRuntimeValidator>();
        await validator.ValidateAsync();
    }

    public static async Task RunApplicationOperationAsync(
        this WebApplication app,
        ApplicationOperation operation)
    {
        if (operation == ApplicationOperation.Run)
        {
            throw new InvalidOperationException("Run is not a provisioning operation.");
        }

        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (operation is ApplicationOperation.Migrate or ApplicationOperation.Provision)
        {
            if (dbContext.Database.IsRelational())
            {
                await dbContext.Database.MigrateAsync();
            }
            else
            {
                await dbContext.Database.EnsureCreatedAsync();
            }
        }

        if (operation is ApplicationOperation.Bootstrap or ApplicationOperation.Provision)
        {
            if (dbContext.Database.IsRelational())
            {
                var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToArray();
                if (pendingMigrations.Length > 0)
                {
                    throw new InvalidOperationException(
                        "Bootstrap requires a current schema. Run --vexorion-operation=migrate first.");
                }
            }

            var provisioner = scope.ServiceProvider.GetRequiredService<IApplicationProvisioner>();
            await provisioner.BootstrapAsync();
        }
    }
}
