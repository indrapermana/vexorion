using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Web.Tests;

public class TenantPlanAuditTests : IClassFixture<StableTestWebApplicationFactory>
{
    private readonly StableTestWebApplicationFactory _factory;

    public TenantPlanAuditTests(StableTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateTenantPlan_LogsPlanLimitChangeAuditEvent()
    {
        var tenantId = Guid.NewGuid();

        var client = _factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.TenantPlans.Manage);

        var response = await client.PostAsJsonAsync($"/api/tenants/{tenantId}/plans", new CreateTenantPlanRequest
        {
            PlanCode = "PRO",
            PlanName = "Pro",
            MaxStorageBytes = 50L * 1024 * 1024 * 1024,
            MaxFileSizeBytes = 500L * 1024 * 1024,
            WarningThresholdPercent = 80,
            SoftBlockThresholdPercent = 95,
            HardBlockThresholdPercent = 100,
            EffectiveFromUtc = DateTime.UtcNow,
            IsDefault = true
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var audit = await dbContext.Set<AuditLog>()
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.EventType == "tenant.plan.limit_changed")
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync();

        Assert.NotNull(audit);
        Assert.Equal(nameof(TenantPlan), audit!.EntityName);
        Assert.Contains("PRO", audit.Description ?? string.Empty);
        Assert.Contains("MaxStorageBytes", audit.MetadataJson ?? string.Empty);
    }
}
