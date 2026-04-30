using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class EmployeeControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EmployeeControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Employees_GetAll_WithoutOrganizationViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.GetAsync("/api/employees");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Employees_GetAll_WithOrganizationViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.GetAsync("/api/employees");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<EmployeeListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Employees_GetById_WithOrganizationViewPermission_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.GetAsync($"/api/employees/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Employees_Create_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.PostAsJsonAsync("/api/employees", new CreateEmployeeRequest { FirstName = "Jane", LastName = "Doe", EmployeeNumber = "E001" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Employees_Delete_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.DeleteAsync($"/api/employees/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
