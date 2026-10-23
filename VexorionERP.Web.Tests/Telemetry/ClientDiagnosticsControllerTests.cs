using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts.Telemetry;
using Xunit;

namespace VexorionERP.Web.Tests;

public sealed class ClientDiagnosticsControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ClientDiagnosticsControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TrackClientError_RequiresAuthentication()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/telemetry/client-errors",
            new ClientDiagnosticRequest
            {
                Application = "main-ui",
                EventName = "api.server-error",
                ApiStatus = 500
            });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TrackClientError_AcceptsAllowlistedMetadata()
    {
        using var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), Array.Empty<string>());

        var response = await client.PostAsJsonAsync(
            "/api/telemetry/client-errors",
            new ClientDiagnosticRequest
            {
                Application = "main-ui",
                EventName = "api.server-error",
                ApiStatus = 500,
                ApiCode = "request.failed",
                ClientTraceId = "0HN123ABC456"
            });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task TrackClientError_RejectsUnboundedOrUntrustedMetadata()
    {
        using var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), Array.Empty<string>());

        var response = await client.PostAsJsonAsync(
            "/api/telemetry/client-errors",
            new ClientDiagnosticRequest
            {
                Application = "main-ui",
                EventName = "api.server-error",
                ApiStatus = 500,
                ApiCode = "password=not-allowed",
                ClientTraceId = "trace id with spaces"
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
