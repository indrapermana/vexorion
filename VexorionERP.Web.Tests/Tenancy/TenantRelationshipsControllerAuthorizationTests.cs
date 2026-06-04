using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantRelationshipsControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TenantRelationshipsControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TenantRelationships_GetAll_WithoutTenantsViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync("/api/tenant-relationships");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantRelationships_GetAll_WithTenantsViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.GetAsync("/api/tenant-relationships");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<TenantRelationshipListItemResponse>>();
        Assert.NotNull(payload);
    }

    [Fact]
    public async Task TenantRelationships_Create_WithoutTenantsManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.View);

        var response = await client.PostAsJsonAsync("/api/tenant-relationships", new CreateTenantRelationshipRequest
        {
            RelatedTenantId = Guid.NewGuid(),
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow),
            ScopeJson = "{\"canAssignPeople\":true}"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TenantRelationships_Create_WithTenantsManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Tenants.Manage);

        var response = await client.PostAsJsonAsync("/api/tenant-relationships", new CreateTenantRelationshipRequest
        {
            RelatedTenantId = Guid.NewGuid(),
            RelationshipType = TenantRelationshipType.DeliveryPartner,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow),
            ScopeJson = "{\"canAssignPeople\":true}"
        });

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}