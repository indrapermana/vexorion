using System.Net;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantStorageExportReportTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public TenantStorageExportReportTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ExportReport_ReturnsCsv_WithEntriesWithinDateRange()
    {
        var tenantId = Guid.NewGuid();
        await SeedLedgerAsync(tenantId);

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.StorageUsage.View);

        var response = await client.GetAsync($"/api/tenants/{tenantId}/storage/export?startDate=2026-05-01&endDate=2026-05-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var csv = await response.Content.ReadAsStringAsync();
        Assert.Contains("OccurredAtUtc,OperationType,DeltaBytes,ResultingUsedBytes", csv);
        Assert.Contains("upload,200,200", csv);
        Assert.Contains("delete,-50,150", csv);
        Assert.DoesNotContain("archive", csv); // outside date range
        Assert.Contains("SUMMARY,TOTAL,150,150", csv);
    }

    private async Task SeedLedgerAsync(Guid tenantId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        dbContext.StorageUsageLedgers.AddRange(
            new StorageUsageLedger
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OperationType = "upload",
                DeltaBytes = 200,
                ResultingUsedBytes = 200,
                OccurredAtUtc = new DateTime(2026, 5, 2, 10, 0, 0, DateTimeKind.Utc)
            },
            new StorageUsageLedger
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OperationType = "delete",
                DeltaBytes = -50,
                ResultingUsedBytes = 150,
                OccurredAtUtc = new DateTime(2026, 5, 4, 10, 0, 0, DateTimeKind.Utc)
            },
            new StorageUsageLedger
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OperationType = "archive",
                DeltaBytes = 10,
                ResultingUsedBytes = 160,
                OccurredAtUtc = new DateTime(2026, 6, 2, 10, 0, 0, DateTimeKind.Utc)
            });

        await dbContext.SaveChangesAsync();
    }
}
