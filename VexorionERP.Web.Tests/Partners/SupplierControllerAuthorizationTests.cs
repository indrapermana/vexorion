using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class SupplierControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SupplierControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Suppliers_GetAll_WithoutSuppliersViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.GetAsync("/api/suppliers");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Suppliers_GetAll_WithSuppliersViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Suppliers.View);

        var response = await client.GetAsync("/api/suppliers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<SupplierListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Suppliers_GetById_WithSuppliersViewPermission_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Suppliers.View);

        var response = await client.GetAsync($"/api/suppliers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Suppliers_Create_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Suppliers.View);

        var response = await client.PostAsJsonAsync("/api/suppliers", new CreateSupplierRequest { SupplierNumber = "S001", Name = "Vendor" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Suppliers_Delete_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Suppliers.View);

        var response = await client.DeleteAsync($"/api/suppliers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
