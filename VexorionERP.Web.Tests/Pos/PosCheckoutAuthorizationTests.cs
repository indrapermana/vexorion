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

    [Fact]
    public async Task Refund_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/pos/refund", new PosRefundRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refund_WithoutRefundPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Checkout);

        var response = await client.PostAsJsonAsync("/api/pos/refund", new PosRefundRequest());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Refund_WithPermission_ResolvesServiceAndReachesAction()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Refund);

        var response = await client.PostAsJsonAsync("/api/pos/refund", new PosRefundRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RefundLines_WithoutRefundPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Checkout);

        var response = await client.GetAsync($"/api/pos/refund/{Guid.NewGuid()}/lines");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "reconciliation")]
    [InlineData("POST", "cash-movements")]
    public async Task ShiftReconciliationEndpoints_WithoutShiftClosePermission_ReturnForbidden(string method, string suffix)
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Checkout);
        using var request = new HttpRequestMessage(new HttpMethod(method), $"/api/pos/shifts/{Guid.NewGuid()}/{suffix}");
        if (method == "POST")
            request.Content = JsonContent.Create(new CreatePosCashMovementRequest
            {
                Type = PosCashMovementType.CashIn,
                Amount = 1m,
                Reason = "Register test",
            });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "reconciliation")]
    [InlineData("POST", "cash-movements")]
    public async Task ShiftReconciliationEndpoints_WithShiftClosePermission_ReachAction(string method, string suffix)
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.ShiftClose);
        using var request = new HttpRequestMessage(new HttpMethod(method), $"/api/pos/shifts/{Guid.NewGuid()}/{suffix}");
        if (method == "POST")
            request.Content = JsonContent.Create(new CreatePosCashMovementRequest
            {
                Type = PosCashMovementType.CashIn,
                Amount = 1m,
                Reason = "Register test",
            });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CloseShift_WithoutShiftClosePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Pos.Checkout);

        var response = await client.PostAsJsonAsync($"/api/pos/shifts/{Guid.NewGuid()}/close", new CloseShiftRequest());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
