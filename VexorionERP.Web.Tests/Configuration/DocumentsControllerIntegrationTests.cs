using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class DocumentsControllerIntegrationTests : IClassFixture<GeneratedDocumentsTestWebApplicationFactory>
{
    private static readonly byte[] PdfContent = "%PDF-1.7 test document"u8.ToArray();
    private readonly GeneratedDocumentsTestWebApplicationFactory _factory;

    public DocumentsControllerIntegrationTests(GeneratedDocumentsTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListBySource_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(
            $"/api/documents/source/{GeneratedDocumentSourceType.SalesInvoice}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Generate_WithoutGeneratePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.View);

        var response = await client.PostAsJsonAsync("/api/documents/generate", new GenerateDocumentRequest
        {
            SourceType = GeneratedDocumentSourceType.SalesInvoice,
            SourceEntityId = Guid.NewGuid(),
            Format = GeneratedDocumentFormat.Pdf,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Generate_WithStringEnums_BindsToThePublicJsonContract()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.Generate);
        using var content = new StringContent(
            """{"sourceType":"SalesOrder","sourceEntityId":"00000000-0000-0000-0000-000000000000","format":"Docx","forceRegenerate":false}""",
            Encoding.UTF8,
            "application/json");

        var response = await client.PostAsync("/api/documents/generate", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("Source entity id is required", problem.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.False(problem.Extensions.TryGetValue("code", out var code) && code?.ToString() == "validation.failed");
    }

    [Fact]
    public async Task Regenerate_WithoutRegeneratePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.View);

        var response = await client.PostAsync($"/api/documents/{Guid.NewGuid()}/regenerate", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListBySource_ReturnsOnlyCurrentTenantDocuments()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var sourceEntityId = Guid.NewGuid();
        var tenantADocument = await SeedDocumentAsync(tenantA, sourceEntityId, "tenant-a.pdf");
        await SeedDocumentAsync(tenantB, sourceEntityId, "tenant-b.pdf");

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantA, AppPermissions.Documents.View);

        var response = await client.GetAsync(
            $"/api/documents/source/{GeneratedDocumentSourceType.SalesInvoice}/{sourceEntityId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<IReadOnlyCollection<GeneratedDocumentResponse>>();
        var document = Assert.Single(Assert.IsAssignableFrom<IReadOnlyCollection<GeneratedDocumentResponse>>(payload));
        Assert.Equal(tenantADocument, document.GeneratedDocumentId);
        Assert.Equal("tenant-a.pdf", document.FileName);
    }

    [Fact]
    public async Task Inline_WhenDocumentBelongsToAnotherTenant_ReturnsNotFoundWithoutStorageRead()
    {
        var tenantA = Guid.NewGuid();
        var documentId = await SeedDocumentAsync(tenantA, Guid.NewGuid(), "restricted.pdf");
        var downloadsBeforeRequest = _factory.Storage.DownloadRequestCount;
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.View);

        var response = await client.GetAsync($"/api/documents/{documentId}/inline");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(downloadsBeforeRequest, _factory.Storage.DownloadRequestCount);
    }

    [Fact]
    public async Task DownloadLink_WhenDocumentBelongsToAnotherTenant_ReturnsNotFoundWithoutStorageRequest()
    {
        var tenantA = Guid.NewGuid();
        var documentId = await SeedDocumentAsync(tenantA, Guid.NewGuid(), "restricted-link.pdf");
        var requestsBeforeCall = _factory.Storage.DownloadUrlRequestCount;
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.Download);

        var response = await client.GetAsync($"/api/documents/{documentId}/download-link");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(requestsBeforeCall, _factory.Storage.DownloadUrlRequestCount);
    }

    [Fact]
    public async Task Regenerate_WhenDocumentBelongsToAnotherTenant_ReturnsNotFoundWithoutStorageUpload()
    {
        var ownerTenant = Guid.NewGuid();
        var documentId = await SeedDocumentAsync(ownerTenant, Guid.NewGuid(), "restricted-regenerate.pdf");
        var uploadsBeforeRequest = _factory.Storage.UploadRequestCount;
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Documents.Regenerate);

        var response = await client.PostAsync($"/api/documents/{documentId}/regenerate", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(uploadsBeforeRequest, _factory.Storage.UploadRequestCount);
    }

    [Fact]
    public async Task Inline_WithViewPermission_ReturnsMockedPdfAsInlineContent()
    {
        var tenantId = Guid.NewGuid();
        var documentId = await SeedDocumentAsync(tenantId, Guid.NewGuid(), "invoice.pdf");
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Documents.View);

        var response = await client.GetAsync($"/api/documents/{documentId}/inline");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("inline; filename=\"invoice.pdf\"", response.Content.Headers.ContentDisposition?.ToString());
        Assert.Equal(PdfContent, await response.Content.ReadAsByteArrayAsync());
    }

    private async Task<Guid> SeedDocumentAsync(Guid tenantId, Guid sourceEntityId, string fileName)
    {
        var documentId = Guid.NewGuid();
        var blobPath = $"generated/{documentId:N}/{fileName}";
        _factory.Storage.Add(blobPath, PdfContent, "application/pdf");

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.GeneratedDocuments.Add(new GeneratedDocument
        {
            Id = documentId,
            TenantId = tenantId,
            SourceType = GeneratedDocumentSourceType.SalesInvoice,
            SourceEntityId = sourceEntityId,
            Format = GeneratedDocumentFormat.Pdf,
            Status = GeneratedDocumentStatus.Ready,
            Version = 1,
            FileName = fileName,
            ContentType = "application/pdf",
            BlobPath = blobPath,
            ChecksumSha256 = "test-checksum",
            FileSizeBytes = PdfContent.Length,
            GeneratedAtUtc = DateTime.UtcNow,
            GeneratedByUserId = Guid.NewGuid(),
        });
        await dbContext.SaveChangesAsync();
        return documentId;
    }
}
