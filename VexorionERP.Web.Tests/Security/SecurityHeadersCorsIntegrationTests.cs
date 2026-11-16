using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace VexorionERP.Web.Tests.Security;

public sealed class SecurityHeadersCorsIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public SecurityHeadersCorsIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HttpsResponse_EmitsSecurityHeaders()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            // The HSTS middleware intentionally excludes localhost hosts.
            BaseAddress = new Uri("https://api.vexorionerp.test"),
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertHeaderContains(response, "Content-Security-Policy", "default-src 'none'");
        AssertHeaderContains(response, "Content-Security-Policy", "frame-ancestors 'none'");
        AssertHeaderEquals(response, "X-Content-Type-Options", "nosniff");
        AssertHeaderEquals(response, "X-Frame-Options", "DENY");
        AssertHeaderEquals(response, "Referrer-Policy", "strict-origin-when-cross-origin");
        AssertHeaderContains(response, "Strict-Transport-Security", "max-age=");
    }

    [Theory]
    [InlineData("https://app.vexorionerp.com")]
    [InlineData("https://admin.vexorionerp.com")]
    [InlineData("https://pos.vexorionerp.com")]
    public async Task Preflight_AllowedProductionOrigin_ReturnsOnlyThatOrigin(string origin)
    {
        var response = await SendPreflightAsync(origin);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        AssertHeaderEquals(response, "Access-Control-Allow-Origin", origin);
        AssertHeaderContains(response, "Access-Control-Allow-Methods", "GET");
        AssertHeaderContains(response, "Vary", "Origin");
    }

    [Theory]
    [InlineData("https://attacker.invalid")]
    [InlineData("https://app.vexorionerp.com.attacker.invalid")]
    [InlineData("null")]
    public async Task Preflight_DisallowedOrigin_ReturnsNoCorsGrant(string origin)
    {
        var response = await SendPreflightAsync(origin);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
    }

    private async Task<HttpResponseMessage> SendPreflightAsync(string origin)
    {
        var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/customers");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return await client.SendAsync(request);
    }

    private static void AssertHeaderEquals(HttpResponseMessage response, string name, string expected)
    {
        Assert.True(response.Headers.TryGetValues(name, out var values), $"Missing response header {name}.");
        Assert.Equal(expected, Assert.Single(values));
    }

    private static void AssertHeaderContains(HttpResponseMessage response, string name, string expected)
    {
        Assert.True(response.Headers.TryGetValues(name, out var values), $"Missing response header {name}.");
        Assert.Contains(expected, string.Join(",", values), StringComparison.OrdinalIgnoreCase);
    }
}
