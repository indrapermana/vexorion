using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VexorionERP.Models;

namespace VexorionERP.Web.Tests;

internal sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    private const string AuthHeader = "X-Test-Auth";
    private const string TenantHeader = "X-Test-TenantId";
    private const string PermissionsHeader = "X-Test-Permissions";

    public TestAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(AuthHeader, out var authHeaderValue) || authHeaderValue != "true")
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "test-user"),
            new(ClaimTypes.Name, "test-user"),
        };

        if (Request.Headers.TryGetValue(TenantHeader, out var tenantValues) && Guid.TryParse(tenantValues.ToString(), out var tenantId))
        {
            claims.Add(new Claim(AppClaimTypes.TenantId, tenantId.ToString()));
        }

        if (Request.Headers.TryGetValue(PermissionsHeader, out var permissionValues))
        {
            foreach (var permission in permissionValues.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                claims.Add(new Claim(AppClaimTypes.Permission, permission));
            }
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
