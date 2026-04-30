using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class WarehouseControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public WarehouseControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Warehouses_GetAll_WithoutInventoryViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.GetAsync("/api/warehouses");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Warehouses_GetAll_WithInventoryViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync("/api/warehouses");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<WarehouseListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Warehouses_GetById_WithInventoryViewPermission_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync($"/api/warehouses/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Warehouses_Create_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.PostAsJsonAsync("/api/warehouses", new CreateWarehouseRequest { Code = "WH01", Name = "Main" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Warehouses_Delete_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.DeleteAsync($"/api/warehouses/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
