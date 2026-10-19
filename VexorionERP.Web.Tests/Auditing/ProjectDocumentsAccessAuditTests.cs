using System.Net;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
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
        var projectId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.ProjectDocuments.View, AppPermissions.Accounting.View);

        var response = await client.GetAsync($"/api/projects/{projectId}/documents");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var audit = await dbContext.AuditLogs.SingleAsync(x =>
            x.TenantId == tenantId
            && x.EventType == "project.documents.view.documents.access.granted");

        Assert.False(string.IsNullOrWhiteSpace(audit.CorrelationId));
        Assert.Equal(projectId.ToString(), audit.EntityId);

        var auditResponse = await client.GetAsync("/api/audit-logs?page=1&pageSize=200");
        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);
        var auditPayload = await auditResponse.Content.ReadFromJsonAsync<AuditLogListResponse>();
        Assert.Contains(auditPayload!.Items, item =>
            item.Id == audit.Id && item.CorrelationId == audit.CorrelationId);
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

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var audit = await dbContext.AuditLogs.SingleAsync(x =>
            x.TenantId == tenantId
            && x.EventType == "project.documents.download.document.access.granted");

        Assert.False(string.IsNullOrWhiteSpace(audit.CorrelationId));
        using var metadata = JsonDocument.Parse(audit.MetadataJson!);
        Assert.Equal(documentId, metadata.RootElement.GetProperty("ResourceId").GetGuid());
    }
}
