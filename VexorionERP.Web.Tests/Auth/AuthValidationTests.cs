using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class AuthValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthValidationTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_WithMissingRequiredFields_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(LoginRequest.TenantCode), problem.Errors.Keys);
        Assert.Contains(nameof(LoginRequest.UserNameOrEmail), problem.Errors.Keys);
        Assert.Contains(nameof(LoginRequest.Password), problem.Errors.Keys);
    }

    [Fact]
    public async Task Refresh_WithShortToken_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = "short-token"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains(nameof(RefreshTokenRequest.RefreshToken), problem.Errors.Keys);
    }
}
