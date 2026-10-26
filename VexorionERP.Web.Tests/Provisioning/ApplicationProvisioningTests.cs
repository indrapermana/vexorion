using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Web.Tests;

public sealed class ApplicationProvisioningTests
{
    [Fact]
    public async Task RuntimeUploadValidation_DoesNotRegisterOrRequireAMalwareScanner()
    {
        await using var factory = new ProvisioningTestWebApplicationFactory();
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Null(scope.ServiceProvider.GetService<IDocumentMalwareScanner>());
        var validator = scope.ServiceProvider.GetRequiredService<IDocumentUploadSecurityService>();
        using var content = new MemoryStream("%PDF-1.7\n"u8.ToArray());
        var result = await validator.ValidateAsync(new FormFile(content, 0, content.Length, "file", "contract.pdf"));
        Assert.True(result.Succeeded);
        Assert.Equal("application/pdf", result.Value!.ContentType);
    }

    [Fact]
    public async Task ConcurrentRuntimeValidation_DoesNotCreateSchemaOrSeedData()
    {
        await using var factory = new ProvisioningTestWebApplicationFactory();
        using var client = factory.CreateClient();

        await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
        {
            await using var scope = factory.Services.CreateAsyncScope();
            var validator = scope.ServiceProvider.GetRequiredService<IApplicationRuntimeValidator>();
            await validator.ValidateAsync();
        }));

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var db = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await db.Tenants.CountAsync());
        Assert.Equal(0, await db.Roles.CountAsync());
        Assert.Equal(0, await db.Users.CountAsync());
    }

    [Fact]
    public async Task Bootstrap_CreatesRequiredRecords_AndIsIdempotent()
    {
        await using var factory = new ProvisioningTestWebApplicationFactory();

        await RunBootstrapAsync(factory);
        await RunBootstrapAsync(factory);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tenant = await db.Tenants.SingleAsync();
        var user = await db.Users.SingleAsync();

        Assert.Equal("vexorionerp", tenant.Code);
        Assert.Equal(tenant.Id, user.TenantId);
        Assert.Equal(1, await db.Companies.CountAsync());
        Assert.Equal(1, await db.TenantModuleConfigs.CountAsync());
        Assert.Equal(1, await db.TenantPlans.CountAsync());
        Assert.Equal(AppRoles.All.Count, await db.Roles.CountAsync());
        Assert.Equal(1, await db.AuditLogs.CountAsync(x => x.EventType == "bootstrap.seeded"));

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var roles = await userManager.GetRolesAsync(user);
        Assert.Contains(AppRoles.SystemAdmin, roles);
        Assert.Contains(AppRoles.TenantAdmin, roles);
    }

    [Fact]
    public async Task Bootstrap_RetriesSafely_AfterPartialTenantCreation()
    {
        await using var factory = new ProvisioningTestWebApplicationFactory();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tenants.Add(new Tenant { Name = "VexorionERP", Code = "vexorionerp" });
            await db.SaveChangesAsync();
        }

        await RunBootstrapAsync(factory);

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await verificationDb.Tenants.CountAsync());
        Assert.Equal(1, await verificationDb.Companies.CountAsync());
        Assert.Equal(1, await verificationDb.Users.CountAsync());
        Assert.Equal(1, await verificationDb.TenantModuleConfigs.CountAsync());
        Assert.Equal(1, await verificationDb.TenantPlans.CountAsync());
    }

    [Fact]
    public async Task Bootstrap_RejectsAdminIdentityOwnedByAnotherTenant()
    {
        await using var factory = new ProvisioningTestWebApplicationFactory();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var otherTenant = new Tenant { Name = "Other", Code = "other" };
            db.Tenants.Add(otherTenant);
            db.Users.Add(new User
            {
                TenantId = otherTenant.Id,
                UserName = "admin",
                NormalizedUserName = "ADMIN",
                Email = "admin@vexorion.local",
                NormalizedEmail = "ADMIN@VEXORION.LOCAL"
            });
            await db.SaveChangesAsync();
        }

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => RunBootstrapAsync(factory));

        Assert.Contains("another tenant", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("--vexorion-operation=migrate", ApplicationOperation.Migrate)]
    [InlineData("--vexorion-operation=bootstrap", ApplicationOperation.Bootstrap)]
    [InlineData("--vexorion-operation=provision", ApplicationOperation.Provision)]
    public void OperationParser_AcceptsExplicitOperations(string argument, ApplicationOperation expected)
    {
        Assert.Equal(expected, new[] { argument }.GetApplicationOperation());
    }

    [Fact]
    public void ProductionConfiguration_RejectsTrackedPlaceholderSecrets()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db;Database=vexorion;Username=postgres;Password=postgres;Ssl Mode=Require",
                ["Jwt:SecretKey"] = "ChangeThisSecretKeyForProduction12345",
                ["AzureBlob:ConnectionString"] = "UseDevelopmentStorage=true"
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigurationValidator.Validate(configuration, ProductionEnvironment(), ApplicationOperation.Run));

        Assert.Contains("placeholder", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ProductionProvisioningConfiguration_AcceptsManagedValues()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:MigrationConnection"] = "Host=db;Database=vexorion;Username=migrator;Password=StrongDatabasePassword!;Ssl Mode=Require",
                ["Jwt:SecretKey"] = "A-secure-test-JWT-key-with-more-than-32-characters",
                ["Bootstrap:AdminPassword"] = "A-secure-bootstrap-password!",
                ["AzureBlob:ConnectionString"] = "DefaultEndpointsProtocol=https;AccountName=storage;AccountKey=secure-key;EndpointSuffix=core.windows.net"
            })
            .Build();

        ProductionConfigurationValidator.Validate(
            configuration,
            ProductionEnvironment(),
            ApplicationOperation.Provision);
    }

    [Fact]
    public void ProductionConfiguration_AcceptsManagedR2Values()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db;Database=vexorion;Username=app;Password=StrongDatabasePassword!;Ssl Mode=Require",
                ["Jwt:SecretKey"] = "A-secure-test-JWT-key-with-more-than-32-characters",
                ["Storage:Provider"] = "R2",
                ["Storage:R2:AccountId"] = "1234567890abcdef",
                ["Storage:R2:DocumentBucketName"] = "vexorion-documents",
                ["Storage:R2:ProductImageBucketName"] = "vexorion-product-images",
                ["Storage:R2:ProductImagePublicBaseUrl"] = "https://images.vexorionerp.com",
                ["Storage:R2:AccessKeyId"] = "managed-access-key",
                ["Storage:R2:SecretAccessKey"] = "managed-secret-key"
            })
            .Build();

        ProductionConfigurationValidator.Validate(
            configuration,
            ProductionEnvironment(),
            ApplicationOperation.Run);
    }

    private static async Task RunBootstrapAsync(ProvisioningTestWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<IApplicationProvisioner>();
        await provisioner.BootstrapAsync();
    }

    private static IHostEnvironment ProductionEnvironment() => new TestHostEnvironment
    {
        EnvironmentName = Environments.Production
    };

    private sealed class ProvisioningTestWebApplicationFactory : TestWebApplicationFactoryBase
    {
        private readonly string _databaseName = $"vexorion-provisioning-{Guid.NewGuid()}";

        protected override string GetDatabaseName() => _databaseName;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Bootstrap:Tenant:Name"] = "VexorionERP",
                    ["Bootstrap:Tenant:Code"] = "vexorionerp",
                    ["Bootstrap:Company:Name"] = "VexorionERP",
                    ["Bootstrap:Company:Code"] = "MAIN",
                    ["Bootstrap:AdminUser:UserName"] = "admin",
                    ["Bootstrap:AdminUser:Email"] = "admin@vexorion.local",
                    ["Bootstrap:AdminUser:FirstName"] = "System",
                    ["Bootstrap:AdminUser:LastName"] = "Administrator",
                    ["Bootstrap:AdminPassword"] = "TestOnlyStrongPassword123!"
                });
            });
        }
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = string.Empty;
        public string ApplicationName { get; set; } = string.Empty;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
