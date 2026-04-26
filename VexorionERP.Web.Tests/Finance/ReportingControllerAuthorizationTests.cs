using System.Net;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Finance;

public class ReportingControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReportingControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reports_ArAging_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/reports/ar-aging");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reports_ArAging_WithoutBillingView_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync("/api/reports/ar-aging");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Reports_TrialBalance_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/trial-balance");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reports_Dashboard_WithBillingView_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/reports/dashboard");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
