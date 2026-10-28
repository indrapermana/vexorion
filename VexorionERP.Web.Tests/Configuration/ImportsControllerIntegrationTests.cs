using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ImportsControllerIntegrationTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public ImportsControllerIntegrationTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Imports_Types_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/imports/types");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Types_WithoutValidatePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);

        var response = await client.GetAsync("/api/imports/types");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Types_WithValidatePermission_ReturnsSupportedTypes()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.Validate);

        var response = await client.GetAsync("/api/imports/types");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<IReadOnlyCollection<AvailableImportTypeResponse>>();
        Assert.NotNull(payload);
        Assert.Equal(5, payload.Count);
        Assert.Contains(payload, x => x.ImportType == "customer");
    }

    [Fact]
    public async Task Imports_Template_UnknownType_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.Validate);

        var response = await client.GetAsync("/api/imports/template/not-a-real-type");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Template_ReturnsDownloadableXlsxWorkbook()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.Validate);

        var response = await client.GetAsync("/api/imports/template/customer");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("customer-template.xlsx", response.Content.Headers.ContentDisposition?.ToString());
        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var workbook = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
        Assert.NotNull(workbook.GetEntry("xl/workbook.xml"));
        Assert.NotNull(workbook.GetEntry("xl/worksheets/sheet1.xml"));
    }

    [Fact]
    public async Task Imports_Validate_FileExceedsMaxSize_ReturnsPayloadTooLargeProblem()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.Validate);

        var oversizedFile = new byte[(10 * 1024 * 1024) + 1];
        using var form = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent(oversizedFile);

        form.Add(fileContent, "file", "oversized.xlsx");
        form.Add(new StringContent("customer"), "importType");

        var response = await client.PostAsync("/api/imports/validate", form);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("maximum allowed size", problem.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.True(problem.Extensions.TryGetValue("code", out var code));
        Assert.Equal("import.file_too_large", code?.ToString());
    }

    [Fact]
    public async Task Imports_ValidateRows_WithoutValidatePermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Billing.View);
        var request = new ValidateImportRowsRequest
        {
            ImportType = "customer",
            FileName = "customers.xlsx",
            Headers = ["CustomerNumber", "Name"],
            Rows = [new ImportPreviewRowResponse { Values = new Dictionary<string, string> { ["CustomerNumber"] = "C001", ["Name"] = "Edited" } }],
        };

        var response = await client.PostAsJsonAsync("/api/imports/validate-rows", request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Status_UnknownJob_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.ViewHistory);

        var response = await client.GetAsync($"/api/imports/{Guid.NewGuid()}/status");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Imports_History_WithViewHistoryPermission_ReturnsOkEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.ViewHistory);

        var response = await client.GetAsync("/api/imports/history?page=1&pageSize=20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<IReadOnlyCollection<ImportJobHistoryItemResponse>>();
        Assert.NotNull(payload);
        Assert.Empty(payload);
    }

    [Fact]
    public async Task Imports_Submit_WithoutSubmitPermission_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.ViewHistory);

        var response = await client.PostAsync($"/api/imports/{Guid.NewGuid()}/submit", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Status_WhenJobBelongsToAnotherTenant_ReturnsNotFound()
    {
        var tenantA = Guid.NewGuid();
        var importJobId = await SeedImportJobAsync(tenantA, "tenant-a.xlsx");
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.ViewHistory);

        var response = await client.GetAsync($"/api/imports/{importJobId}/status");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Imports_Submit_WhenJobBelongsToAnotherTenant_ReturnsNotFoundWithoutClaimingJob()
    {
        var ownerTenant = Guid.NewGuid();
        var importJobId = await SeedImportJobAsync(ownerTenant, "tenant-a-submit.xlsx");
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Imports.Submit);

        var response = await client.PostAsync($"/api/imports/{importJobId}/submit", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await dbContext.ImportJobs.IgnoreQueryFilters().SingleAsync(x => x.Id == importJobId);
        Assert.Null(job.SubmittedAtUtc);
        Assert.Equal(ImportJobStatus.Validated, job.Status);
    }

    [Fact]
    public async Task Imports_History_ReturnsOnlyCurrentTenantJobs()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenantAJobId = await SeedImportJobAsync(tenantA, "tenant-a.xlsx");
        await SeedImportJobAsync(tenantB, "tenant-b.xlsx");
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantA, AppPermissions.Imports.ViewHistory);

        var response = await client.GetAsync("/api/imports/history?page=1&pageSize=20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<IReadOnlyCollection<ImportJobHistoryItemResponse>>();
        var job = Assert.Single(Assert.IsAssignableFrom<IReadOnlyCollection<ImportJobHistoryItemResponse>>(payload));
        Assert.Equal(tenantAJobId, job.ImportJobId);
        Assert.Equal("tenant-a.xlsx", job.SourceFileName);
    }

    private async Task<Guid> SeedImportJobAsync(Guid tenantId, string fileName)
    {
        var importJobId = Guid.NewGuid();
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.ImportJobs.Add(new ImportJob
        {
            Id = importJobId,
            TenantId = tenantId,
            ImportType = "customer",
            SourceFileName = fileName,
            Status = ImportJobStatus.Validated,
            TotalRows = 1,
            ValidRows = 1,
            RequestedByUserId = Guid.NewGuid(),
            ValidatedAtUtc = DateTime.UtcNow,
            ValidatedRowsJson = "[]",
        });
        await dbContext.SaveChangesAsync();
        return importJobId;
    }
}
