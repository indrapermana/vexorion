using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using Xunit;

namespace VexorionERP.Web.Tests;

public class PasswordResetEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PasswordResetEndpointTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ForgotPassword_ForUnknownAccount_ReturnsAcceptedWithoutRevealingExistence()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest
        {
            TenantCode = "nope",
            UserNameOrEmail = "nobody@example.com"
        });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_WithMissingFields_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ValidateResetToken_WithForgedToken_ReturnsBadRequestWithCode()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password/validate", new ResetTokenRequest
        {
            Token = Guid.NewGuid().ToString("N") + ".4102444800.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("auth.reset_token_invalid", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ResetPassword_WhenConfirmationDiffers_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new CompletePasswordResetRequest
        {
            Token = new string('a', 40),
            NewPassword = "NewPass9",
            ConfirmPassword = "Different9"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(nameof(CompletePasswordResetRequest.ConfirmPassword), await response.Content.ReadAsStringAsync());
    }
}
