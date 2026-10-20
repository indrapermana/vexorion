using Npgsql;

namespace VexorionERP;

public static class ProductionConfigurationValidator
{
    private static readonly string[] PlaceholderFragments =
    [
        "changethis",
        "changeme",
        "developmentonly",
        "placeholder",
        "example"
    ];

    public static void Validate(
        IConfiguration configuration,
        IHostEnvironment environment,
        ApplicationOperation operation)
    {
        if (!environment.IsProduction())
        {
            return;
        }

        var connectionName = operation == ApplicationOperation.Run
            ? "DefaultConnection"
            : "MigrationConnection";
        var connectionString = configuration.GetConnectionString(connectionName);
        RequireSecret($"ConnectionStrings:{connectionName}", connectionString);

        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            RequireSecret($"ConnectionStrings:{connectionName} password", builder.Password);
            if (!builder.SslMode.Equals(SslMode.Require) &&
                !builder.SslMode.Equals(SslMode.VerifyCA) &&
                !builder.SslMode.Equals(SslMode.VerifyFull))
            {
                throw new InvalidOperationException(
                    $"ConnectionStrings:{connectionName} must require TLS in Production.");
            }
        }
        catch (ArgumentException exception)
        {
            throw new InvalidOperationException(
                $"ConnectionStrings:{connectionName} is not a valid PostgreSQL connection string.", exception);
        }

        RequireSecret("Jwt:SecretKey", configuration["Jwt:SecretKey"]);

        var bootstrapPassword = configuration["Bootstrap:AdminPassword"];
        if (operation is ApplicationOperation.Bootstrap or ApplicationOperation.Provision)
        {
            RequireSecret("Bootstrap:AdminPassword", bootstrapPassword);
        }
        else if (!string.IsNullOrWhiteSpace(bootstrapPassword))
        {
            RequireSecret("Bootstrap:AdminPassword", bootstrapPassword);
        }

        var storageConnection = configuration["AzureBlob:ConnectionString"];
        RequireSecret("AzureBlob:ConnectionString", storageConnection);
        if (storageConnection!.Contains("UseDevelopmentStorage=true", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "AzureBlob:ConnectionString cannot use development storage in Production.");
        }
    }

    private static void RequireSecret(string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            PlaceholderFragments.Any(fragment => value.Contains(fragment, StringComparison.OrdinalIgnoreCase)) ||
            string.Equals(value.Trim(), "postgres", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"{key} is missing or contains a known placeholder value. Supply it through managed configuration.");
        }
    }
}
