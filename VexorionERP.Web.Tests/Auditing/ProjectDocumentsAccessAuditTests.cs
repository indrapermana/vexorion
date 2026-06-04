using System.Net;
using System.Net.Http.Json;
using VexorionERP.Contracts;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ProjectDocumentsAccessAuditTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public ProjectDocumentsAccessAuditTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetDocuments_WithViewPermission_WritesAccessGrantedAudit()
    {
        var tenantId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View, AppPermissions.Accounting.View);

        var response = await client.GetAsync($"/api/projects/{Guid.NewGuid()}/documents");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auditResponse = await client.GetAsync("/api/audit-logs?page=1&pageSize=200");
        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);

        var auditPayload = await auditResponse.Content.ReadFromJsonAsync<AuditLogListResponse>();
        Assert.NotNull(auditPayload);
        Assert.Contains(auditPayload.Items, x => x.EventType == "project.documents.view.documents.access.granted");
    }

    [Fact]
    public async Task GetDownload_WithDownloadPermission_WritesAccessGrantedAudit()
    {
        var tenantId = Guid.NewGuid();
        var documentId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.Download, AppPermissions.Accounting.View);

        var response = await client.GetAsync($"/api/projects/{Guid.NewGuid()}/documents/{documentId}/download");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var auditResponse = await client.GetAsync("/api/audit-logs?page=1&pageSize=200");
        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);

        var auditPayload = await auditResponse.Content.ReadFromJsonAsync<AuditLogListResponse>();
        Assert.NotNull(auditPayload);
        Assert.Contains(auditPayload.Items, x => x.EventType == "project.documents.download.document.access.granted");
    }
}