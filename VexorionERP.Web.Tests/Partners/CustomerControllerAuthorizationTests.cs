using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class CustomerControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CustomerControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Customers_GetAll_WithoutCustomersViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.GetAsync("/api/customers");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Customers_GetAll_WithCustomersViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Customers.View);

        var response = await client.GetAsync("/api/customers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<CustomerListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Customers_GetById_WithCustomersViewPermission_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Customers.View);

        var response = await client.GetAsync($"/api/customers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Customers_Create_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Customers.View);

        var response = await client.PostAsJsonAsync("/api/customers", new CreateCustomerRequest { CustomerNumber = "C001", Name = "Alice" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Customers_Delete_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Customers.View);

        var response = await client.DeleteAsync($"/api/customers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
