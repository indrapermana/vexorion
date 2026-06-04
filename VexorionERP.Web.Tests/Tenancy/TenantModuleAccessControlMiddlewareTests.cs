using System.Net;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantModuleAccessControlMiddlewareTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public TenantModuleAccessControlMiddlewareTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ProjectsEndpoint_WhenProjectModuleDisabled_ReturnsForbidden()
    {
        var tenantId = Guid.NewGuid();
        await SeedModuleConfigAsync(tenantId, projectEnabled: false, employeeEnabled: true, documentEnabled: true);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Projects.View);

        var response = await client.GetAsync("/api/projects");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task EmployeesEndpoint_WhenEmployeeModuleDisabled_ReturnsForbidden()
    {
        var tenantId = Guid.NewGuid();
        await SeedModuleConfigAsync(tenantId, projectEnabled: true, employeeEnabled: false, documentEnabled: true);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Organization.View);

        var response = await client.GetAsync("/api/employees");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProjectsEndpoint_WhenNoModuleConfigExists_IsNotForbidden()
    {
        var tenantId = Guid.NewGuid();

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Projects.View);

        var response = await client.GetAsync("/api/projects");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task SeedModuleConfigAsync(Guid tenantId, bool projectEnabled, bool employeeEnabled, bool documentEnabled)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        dbContext.TenantModuleConfigs.Add(new TenantModuleConfig
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProjectManagementEnabled = projectEnabled,
            EmployeeManagementEnabled = employeeEnabled,
            DocumentManagementEnabled = documentEnabled,
            SalesEnabled = true,
            PurchasingEnabled = true,
            InventoryEnabled = true,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
    }
}
