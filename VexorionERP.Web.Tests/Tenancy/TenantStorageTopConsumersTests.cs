using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantStorageTopConsumersTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public TenantStorageTopConsumersTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TopConsumers_ReturnsProjectsAndDocumentsOrderedBySize()
    {
        var tenantId = Guid.NewGuid();
        await SeedProjectDocumentsAsync(tenantId);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.StorageUsage.View);

        var response = await client.GetAsync($"/api/tenants/{tenantId}/storage/top-consumers?take=2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<StorageTopConsumersResponse>();
        Assert.NotNull(payload);
        Assert.Equal(tenantId, payload!.TenantId);

        Assert.Equal(2, payload.TopProjects.Count);
        Assert.Equal(2, payload.TopDocuments.Count);

        var topProject = payload.TopProjects.First();
        Assert.Equal("Project A", topProject.ProjectName);
        Assert.Equal(700, topProject.TotalBytes);
        Assert.Equal(2, topProject.DocumentCount);

        var topDocument = payload.TopDocuments.First();
        Assert.Equal("Spec-A-2", topDocument.Title);
        Assert.Equal(500, topDocument.FileSizeBytes);
    }

    private async Task SeedProjectDocumentsAsync(Guid tenantId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var categoryId = Guid.NewGuid();
        dbContext.ProjectCategories.Add(new ProjectCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Code = "GEN",
            Name = "General"
        });

        var projectAId = Guid.NewGuid();
        var projectBId = Guid.NewGuid();

        dbContext.Projects.AddRange(
            new Project
            {
                Id = projectAId,
                TenantId = tenantId,
                ProjectCategoryId = categoryId,
                ProjectNumber = "PRJ-A",
                Name = "Project A",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = ProjectLifecycleStatus.Draft
            },
            new Project
            {
                Id = projectBId,
                TenantId = tenantId,
                ProjectCategoryId = categoryId,
                ProjectNumber = "PRJ-B",
                Name = "Project B",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = ProjectLifecycleStatus.Draft
            });

        dbContext.ProjectDocuments.AddRange(
            new ProjectDocument
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ProjectId = projectAId,
                DocumentNumber = "DOC-A-1",
                Title = "Spec-A-1",
                FileName = "spec-a-1.pdf",
                ContentType = "application/pdf",
                StoragePath = "a/spec-a-1.pdf",
                FileSizeBytes = 200
            },
            new ProjectDocument
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ProjectId = projectAId,
                DocumentNumber = "DOC-A-2",
                Title = "Spec-A-2",
                FileName = "spec-a-2.pdf",
                ContentType = "application/pdf",
                StoragePath = "a/spec-a-2.pdf",
                FileSizeBytes = 500
            },
            new ProjectDocument
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ProjectId = projectBId,
                DocumentNumber = "DOC-B-1",
                Title = "Spec-B-1",
                FileName = "spec-b-1.pdf",
                ContentType = "application/pdf",
                StoragePath = "b/spec-b-1.pdf",
                FileSizeBytes = 300
            });

        await dbContext.SaveChangesAsync();
    }
}
