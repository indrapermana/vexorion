using VexorionERP.Models.Identity;

namespace VexorionERP.Web.Tests.Support;

internal static class TestJwtTokenFactory
{
    public static void SetBearerToken(this HttpClient client, Guid tenantId, params string[] permissions)
    {
        client.DefaultRequestHeaders.Remove("X-Test-Auth");
        client.DefaultRequestHeaders.Remove("X-Test-TenantId");
        client.DefaultRequestHeaders.Remove("X-Test-Permissions");
        client.DefaultRequestHeaders.Remove("Authorization");

        client.DefaultRequestHeaders.Add("X-Test-Auth", "true");
        client.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());

        if (permissions.Length > 0)
        {
            client.DefaultRequestHeaders.Add("X-Test-Permissions", string.Join(',', permissions));
        }
    }
}
