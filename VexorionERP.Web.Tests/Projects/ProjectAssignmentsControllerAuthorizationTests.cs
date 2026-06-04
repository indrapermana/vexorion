using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ProjectAssignmentsControllerAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ProjectAssignmentsControllerAuthorizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ProjectAssignments_GetAll_WithoutProjectsViewPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Inventory.View);

        var response = await client.GetAsync($"/api/projects/{Guid.NewGuid()}/assignments");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProjectAssignments_GetAll_WithProjectsViewPermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Projects.View);

        var response = await client.GetAsync($"/api/projects/{Guid.NewGuid()}/assignments");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProjectAssignments_Create_WithoutProjectsManagePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Projects.View);

        var response = await client.PostAsJsonAsync($"/api/projects/{Guid.NewGuid()}/assignments", new CreateProjectAssignmentRequest
        {
            EmployeeId = Guid.NewGuid(),
            RoleTitle = "Reviewer",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            EndDate = null,
            IsPrimaryAssignment = false
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProjectAssignments_Create_WithProjectsManagePermission_IsNotForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Projects.Manage);

        var response = await client.PostAsJsonAsync($"/api/projects/{Guid.NewGuid()}/assignments", new CreateProjectAssignmentRequest
        {
            EmployeeId = Guid.NewGuid(),
            RoleTitle = "Reviewer",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            EndDate = null,
            IsPrimaryAssignment = false
        });

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}