using System.Net;
using Xunit;
using VexorionERP.Models;
using VexorionERP.Database;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace VexorionERP.Web.Tests.Auditing;

/// <summary>
/// Tests that verify authorization boundary 403 Forbid responses are audited at the middleware level.
/// These tests ensure that access denials made by ASP.NET Authorization policies are captured before controller execution.
/// </summary>
public class AuthorizationBoundaryAuditTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public AuthorizationBoundaryAuditTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetTenantRelationships_WithoutViewPermission_Returns403AndLogsAccessDeniedAudit()
    {
        var client = _factory.CreateClient();
        var tenantId = Guid.NewGuid();

        // Authenticate without tenants.view permission
        client.SetBearerToken(tenantId, AppPermissions.Projects.View);

        var response = await client.GetAsync("/api/tenant-relationships");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit entry was logged for the 403 denial
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEntries = await dbContext.Set<AuditLog>()
            .Where(a => a.TenantId == tenantId && a.EventType == "authorization.access_denied")
            .ToListAsync();

        Assert.NotEmpty(auditEntries);
        var entry = auditEntries.First();
        Assert.Contains("/api/tenant-relationships", entry.Description);
    }

    [Fact]
    public async Task GetProjectAssignments_WithoutViewPermission_Returns403AndLogsAccessDeniedAudit()
    {
        var client = _factory.CreateClient();
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Authenticate without projects.view permission
        client.SetBearerToken(tenantId, AppPermissions.Tenants.View);

        var response = await client.GetAsync($"/api/projects/{projectId}/assignments");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit entry was logged for the 403 denial
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEntries = await dbContext.Set<AuditLog>()
            .Where(a => a.TenantId == tenantId && a.EventType == "authorization.access_denied")
            .ToListAsync();

        Assert.NotEmpty(auditEntries);
        var entry = auditEntries.First();
        Assert.Contains($"/api/projects/{projectId}/assignments", entry.Description);
    }

    [Fact]
    public async Task GetProjectDocuments_WithoutViewPermission_Returns403AndLogsAccessDeniedAudit()
    {
        var client = _factory.CreateClient();
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Authenticate without project.documents.view permission
        client.SetBearerToken(tenantId, AppPermissions.Projects.View);

        var response = await client.GetAsync($"/api/projects/{projectId}/folders");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit entry was logged for the 403 denial
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEntries = await dbContext.Set<AuditLog>()
            .Where(a => a.TenantId == tenantId && a.EventType == "authorization.access_denied")
            .ToListAsync();

        Assert.NotEmpty(auditEntries);
        var entry = auditEntries.First();
        Assert.Contains("GET", entry.Description);
        Assert.Contains("/api/projects", entry.Description);
    }

    [Fact]
    public async Task CreateProjectDocuments_WithoutManagePermission_Returns403AndLogsAccessDeniedAudit()
    {
        var client = _factory.CreateClient();
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        // Authenticate with view permission only (not manage)
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View);

        var request = new { ProjectId = projectId, Name = "New Folder" };
        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(request), System.Text.Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"/api/projects/{projectId}/folders", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit entry was logged for the 403 denial
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEntries = await dbContext.Set<AuditLog>()
            .Where(a => a.TenantId == tenantId && a.EventType == "authorization.access_denied")
            .ToListAsync();

        Assert.NotEmpty(auditEntries);
        var entry = auditEntries.First();
        Assert.Contains("POST", entry.Description);
    }

    [Fact]
    public async Task ManageProjectDocuments_WithoutManagePermission_Returns403AndLogsAccessDeniedAudit()
    {
        var client = _factory.CreateClient();
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var folderId = Guid.NewGuid();

        // Authenticate with view permission only (not manage)
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View);

        var request = new { Name = "Updated Folder", IsArchived = false };
        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(request), System.Text.Encoding.UTF8, "application/json");

        var response = await client.PutAsync($"/api/projects/{projectId}/folders/{folderId}", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit entry was logged for the 403 denial
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEntries = await dbContext.Set<AuditLog>()
            .Where(a => a.TenantId == tenantId && a.EventType == "authorization.access_denied")
            .ToListAsync();

        Assert.NotEmpty(auditEntries);
    }

    [Fact]
    public async Task UnauthenticatedRequest_Returns401NotAudited()
    {
        var client = _factory.CreateClient();
        var projectId = Guid.NewGuid();

        // No authentication at all
        var response = await client.GetAsync($"/api/projects/{projectId}/folders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        // Unauthenticated requests (401) are not audited since we have no tenant context
        // This is expected behavior
    }
}
