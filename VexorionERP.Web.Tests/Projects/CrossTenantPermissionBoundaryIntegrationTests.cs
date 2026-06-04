using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class CrossTenantPermissionBoundaryIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public CrossTenantPermissionBoundaryIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetProjectById_WhenProjectBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.Projects.View);

        var response = await client.GetAsync($"/api/projects/{seed.ProjectId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDocumentById_WhenDocumentBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.ProjectDocuments.View);

        var response = await client.GetAsync($"/api/projects/{seed.ProjectId}/documents/{seed.DocumentId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateAssignment_WhenProjectBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var seed = await SeedTenantProjectDocumentAsync(tenantA);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantB, AppPermissions.Projects.Manage);

        var response = await client.PostAsJsonAsync(
            $"/api/projects/{seed.ProjectId}/assignments",
            new CreateProjectAssignmentRequest
            {
                EmployeeId = Guid.NewGuid(),
                RoleTitle = "Boundary check",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                EndDate = null,
                IsPrimaryAssignment = false,
                Notes = "cross-tenant"
            });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<(Guid ProjectId, Guid DocumentId)> SeedTenantProjectDocumentAsync(Guid tenantId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var categoryId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var documentId = Guid.NewGuid();

        dbContext.ProjectCategories.Add(new ProjectCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Code = "GEN",
            Name = "General"
        });

        dbContext.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = categoryId,
            ProjectNumber = $"PRJ-{projectId.ToString("N")[..8].ToUpperInvariant()}",
            Name = "Tenant A Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        });

        dbContext.ProjectDocuments.Add(new ProjectDocument
        {
            Id = documentId,
            TenantId = tenantId,
            ProjectId = projectId,
            DocumentNumber = "DOC-BOUNDARY-1",
            Title = "Restricted Document",
            FileName = "restricted.pdf",
            ContentType = "application/pdf",
            StoragePath = "restricted/restricted.pdf",
            FileSizeBytes = 100,
            CurrentVersionNumber = 1,
            Status = ManagedDocumentStatus.Draft,
            IsActive = true
        });

        await dbContext.SaveChangesAsync();
        return (projectId, documentId);
    }
}
