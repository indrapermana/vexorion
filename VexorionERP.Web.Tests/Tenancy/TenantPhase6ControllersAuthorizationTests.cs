using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantPhase6ControllersAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TenantPhase6ControllersAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TenantPlans_Get_WithoutTenantPlansViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/plans");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantPlans_Get_WithTenantPlansViewPermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.TenantPlans.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/plans");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TenantPlans_Create_WithoutTenantPlansManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.TenantPlans.View);

        var response = await client.PostAsJsonAsync($"/api/tenants/{Guid.NewGuid()}/plans", new CreateTenantPlanRequest
        {
            PlanCode = "BASIC",
            PlanName = "Basic",
            MaxStorageBytes = 10L * 1024 * 1024 * 1024,
            MaxFileSizeBytes = 100L * 1024 * 1024,
            WarningThresholdPercent = 80,
            SoftBlockThresholdPercent = 95,
            HardBlockThresholdPercent = 100,
            EffectiveFromUtc = DateTime.UtcNow,
            IsDefault = true
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantModules_Get_WithoutTenantModulesViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/modules");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantStorage_Summary_WithStorageUsageViewPermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.StorageUsage.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/storage/summary");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TenantStorage_Trend_WithoutStorageUsageViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/storage/trend?daysBack=30");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantStorage_TopConsumers_WithStorageUsageViewPermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.StorageUsage.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/storage/top-consumers?take=10");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TenantStorage_Export_WithoutStorageUsageViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.GetAsync($"/api/tenants/{Guid.NewGuid()}/storage/export");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
