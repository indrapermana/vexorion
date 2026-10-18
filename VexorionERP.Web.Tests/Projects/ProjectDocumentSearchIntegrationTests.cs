using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ProjectDocumentSearchIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public ProjectDocumentSearchIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Search_MatchesDocumentProjectAndCategoryFieldsWithoutDuplicates()
    {
        var tenantId = Guid.NewGuid();
        var expected = await SeedSearchDocumentsAsync(tenantId);
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View);

        await AssertSingleMatchAsync(client, "title-needle", expected.TitleMatchId);
        await AssertSingleMatchAsync(client, "project-needle", expected.ProjectMatchId);
        await AssertSingleMatchAsync(client, "category-needle", expected.CategoryMatchId);

        var response = await client.GetAsync("/api/project-documents/search?searchTerm=shared-needle");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rows = await response.Content.ReadFromJsonAsync<List<ProjectDocumentSearchItemResponse>>();
        Assert.NotNull(rows);
        Assert.Single(rows!, row => row.Id == expected.MultiFieldMatchId);
    }

    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    public async Task Search_TreatsLikeWildcardCharactersAsLiteralText(string searchTerm)
    {
        var tenantId = Guid.NewGuid();
        var expected = await SeedSearchDocumentsAsync(tenantId);
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View);

        await AssertSingleMatchAsync(client, Uri.EscapeDataString(searchTerm), expected.LiteralWildcardMatchId);
    }

    private static async Task AssertSingleMatchAsync(HttpClient client, string encodedTerm, Guid expectedId)
    {
        var response = await client.GetAsync($"/api/project-documents/search?searchTerm={encodedTerm}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rows = await response.Content.ReadFromJsonAsync<List<ProjectDocumentSearchItemResponse>>();
        var row = Assert.Single(rows!);
        Assert.Equal(expectedId, row.Id);
    }

    private async Task<SearchSeed> SeedSearchDocumentsAsync(Guid tenantId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var ordinaryCategoryId = Guid.NewGuid();
        var searchableCategoryId = Guid.NewGuid();
        dbContext.ProjectCategories.AddRange(
            new ProjectCategory
            {
                Id = ordinaryCategoryId,
                TenantId = tenantId,
                Code = $"GEN-{tenantId:N}",
                Name = "General"
            },
            new ProjectCategory
            {
                Id = searchableCategoryId,
                TenantId = tenantId,
                Code = "CATEGORY-NEEDLE",
                Name = "Search category"
            });

        var ordinaryProjectId = Guid.NewGuid();
        var searchableProjectId = Guid.NewGuid();
        var categoryProjectId = Guid.NewGuid();
        dbContext.Projects.AddRange(
            CreateProject(ordinaryProjectId, tenantId, ordinaryCategoryId, "ORDINARY", "Ordinary project"),
            CreateProject(searchableProjectId, tenantId, ordinaryCategoryId, "PROJECT-NEEDLE", "Project needle"),
            CreateProject(categoryProjectId, tenantId, searchableCategoryId, "CATEGORY-PROJECT", "Category project"));

        var titleMatchId = Guid.NewGuid();
        var projectMatchId = Guid.NewGuid();
        var categoryMatchId = Guid.NewGuid();
        var multiFieldMatchId = Guid.NewGuid();
        var literalWildcardMatchId = Guid.NewGuid();
        dbContext.ProjectDocuments.AddRange(
            CreateDocument(titleMatchId, tenantId, ordinaryProjectId, "DOC-TITLE", "Title-Needle specification"),
            CreateDocument(projectMatchId, tenantId, searchableProjectId, "DOC-PROJECT", "Project field result"),
            CreateDocument(categoryMatchId, tenantId, categoryProjectId, "DOC-CATEGORY", "Category field result"),
            CreateDocument(multiFieldMatchId, tenantId, ordinaryProjectId, "SHARED-NEEDLE", "Shared-Needle", "shared-needle.pdf", "shared-needle"),
            CreateDocument(literalWildcardMatchId, tenantId, ordinaryProjectId, "DOC-WILDCARD", "Budget 100%_Final"));

        await dbContext.SaveChangesAsync();
        return new SearchSeed(titleMatchId, projectMatchId, categoryMatchId, multiFieldMatchId, literalWildcardMatchId);
    }

    private static Project CreateProject(Guid id, Guid tenantId, Guid categoryId, string number, string name) =>
        new()
        {
            Id = id,
            TenantId = tenantId,
            ProjectCategoryId = categoryId,
            ProjectNumber = $"{number}-{id:N}",
            Name = name,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        };

    private static ProjectDocument CreateDocument(
        Guid id,
        Guid tenantId,
        Guid projectId,
        string number,
        string title,
        string? fileName = null,
        string? tags = null) =>
        new()
        {
            Id = id,
            TenantId = tenantId,
            ProjectId = projectId,
            DocumentNumber = $"{number}-{id:N}",
            Title = title,
            FileName = fileName ?? $"{id:N}.pdf",
            ContentType = "application/pdf",
            StoragePath = $"search/{id:N}.pdf",
            FileSizeBytes = 100,
            Tags = tags,
            IsActive = true
        };

    private sealed record SearchSeed(
        Guid TitleMatchId,
        Guid ProjectMatchId,
        Guid CategoryMatchId,
        Guid MultiFieldMatchId,
        Guid LiteralWildcardMatchId);
}
