using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class DepartmentControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public DepartmentControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Departments_GetAll_WithoutOrganizationViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.Manage);

        var response = await client.GetAsync("/api/departments");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Departments_GetAll_WithOrganizationViewPermission_ReturnsOk()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.GetAsync("/api/departments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<List<DepartmentListItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Departments_GetById_WithOrganizationViewPermission_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.GetAsync($"/api/departments/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Departments_Create_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.PostAsJsonAsync("/api/departments", new CreateDepartmentRequest { Name = "Engineering" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Departments_Delete_WithoutManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Organization.View);

        var response = await client.DeleteAsync($"/api/departments/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
