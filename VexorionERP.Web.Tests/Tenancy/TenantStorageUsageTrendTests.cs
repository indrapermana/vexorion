using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantStorageUsageTrendTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public TenantStorageUsageTrendTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Trend_ReturnsBoundedDailyEndOfDayUsageAndCarriesInactiveDays()
    {
        const int daysBack = 4;
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var todayUtc = DateTime.UtcNow.Date;
        var fromUtc = todayUtc.AddDays(-(daysBack - 1));

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.StorageUsageLedgers.AddRange(
                Entry(tenantId, fromUtc.AddMinutes(-1), 50, "baseline"),
                Entry(tenantId, fromUtc.AddHours(8), 100, "upload"),
                Entry(tenantId, fromUtc.AddHours(20), 75, "delete"),
                Entry(tenantId, fromUtc.AddDays(2).AddHours(12), 200, "upload"),
                Entry(otherTenantId, fromUtc.AddHours(23), 9999, "other-tenant"));
            await dbContext.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.StorageUsage.View);
        var response = await client.GetAsync($"/api/tenants/{tenantId}/storage/trend?daysBack={daysBack}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<StorageUsageTrendResponse>();
        Assert.NotNull(payload);
        Assert.Equal(tenantId, payload!.TenantId);
        Assert.Equal("day", payload.Granularity);
        Assert.Equal(fromUtc, payload.FromUtc);
        Assert.Equal(todayUtc, payload.ToUtc);

        var points = payload.Points.ToArray();
        Assert.Equal(daysBack, points.Length);
        Assert.Equal([75L, 75L, 200L, 200L], points.Select(point => point.UsedBytes));
        Assert.Equal(["delete", null, "upload", null], points.Select(point => point.OperationType));
        Assert.Equal(
            Enumerable.Range(0, daysBack).Select(day => fromUtc.AddDays(day)),
            points.Select(point => point.Date));
    }

    [Fact]
    public async Task Trend_RejectsWindowsLargerThanMaximumResponseSize()
    {
        var tenantId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.StorageUsage.View);

        var response = await client.GetAsync($"/api/tenants/{tenantId}/storage/trend?daysBack=366");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static StorageUsageLedger Entry(Guid tenantId, DateTime occurredAtUtc, long usedBytes, string operationType) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OperationType = operationType,
            DeltaBytes = 0,
            ResultingUsedBytes = usedBytes,
            OccurredAtUtc = occurredAtUtc
        };
}
