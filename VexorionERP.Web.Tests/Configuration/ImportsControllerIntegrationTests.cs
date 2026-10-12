using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ImportsControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ImportsControllerIntegrationTests(TestWebApplicationFactory factory)
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
}
