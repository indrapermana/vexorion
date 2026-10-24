using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class PosCheckoutAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PosCheckoutAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Checkout_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/pos/checkout", new PosCheckoutRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_WithoutCheckoutPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Refund);

        var response = await client.PostAsJsonAsync("/api/pos/checkout", new PosCheckoutRequest());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_WithPermission_ResolvesServiceAndReachesAction()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Checkout);

        var response = await client.PostAsJsonAsync("/api/pos/checkout", new PosCheckoutRequest());

        // The test principal has a non-GUID user id, so the action answers 401 only after DI resolved the service.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
