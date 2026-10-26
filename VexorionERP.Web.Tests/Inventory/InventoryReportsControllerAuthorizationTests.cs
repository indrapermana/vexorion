using System.Net;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class InventoryReportsControllerAuthorizationTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    [Fact]
    public async Task InventoryReports_WithoutAuthentication_ReturnsUnauthorized()
    {
        var response = await factory.CreateClient().GetAsync("/api/inventory-reports/valuation");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task InventoryReports_WithoutInventoryView_ReturnsForbidden()
    {
        var client = factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/inventory-reports/valuation");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/inventory-reports/valuation")]
    [InlineData("/api/inventory-reports/movement-audit")]
    [InlineData("/api/inventory-reports/reorder-recommendations")]
    public async Task InventoryReports_WithInventoryView_ReturnsOk(string endpoint)
    {
        var client = factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}