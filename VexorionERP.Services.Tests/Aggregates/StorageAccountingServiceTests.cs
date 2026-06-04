using Microsoft.AspNetCore.Http;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class StorageAccountingServiceTests
{
    [Fact]
    public async Task CheckQuota_NoPlanConfigured_AllowsUpload()
    {
        var tenantId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new StorageAccountingService();

        var result = await service.CheckQuotaAsync(tenantId, incomingFileSizeBytes: 1024, db);

        Assert.True(result.Succeeded);
        Assert.True(result.Value);
    }

    [Fact]
    public async Task CheckQuota_FileSizeExceedsPlanLimit_Returns413()
    {
        var tenantId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new StorageAccountingService();

        db.TenantPlans.Add(new TenantPlan
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PlanCode = "BASIC",
            PlanName = "Basic",
            MaxStorageBytes = 10L * 1024 * 1024,
            MaxFileSizeBytes = 100,
            EffectiveFromUtc = DateTime.UtcNow.AddDays(-1),
            EffectiveToUtc = DateTime.UtcNow.AddDays(1),
            IsDefault = true
        });
        await db.SaveChangesAsync();

        var result = await service.CheckQuotaAsync(tenantId, incomingFileSizeBytes: 101, db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, result.StatusCode);
    }

    [Fact]
    public async Task CheckQuota_TotalStorageWouldExceedLimit_Returns507()
    {
        var tenantId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new StorageAccountingService();

        db.TenantPlans.Add(new TenantPlan
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PlanCode = "BASIC",
            PlanName = "Basic",
            MaxStorageBytes = 1000,
            MaxFileSizeBytes = 500,
            EffectiveFromUtc = DateTime.UtcNow.AddDays(-1),
            EffectiveToUtc = DateTime.UtcNow.AddDays(1),
            IsDefault = true
        });

        db.StorageUsageSummaries.Add(new StorageUsageSummary
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UsedBytes = 900,
            ReservedBytes = 0,
            LastCalculatedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        var result = await service.CheckQuotaAsync(tenantId, incomingFileSizeBytes: 150, db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status507InsufficientStorage, result.StatusCode);
    }

    [Fact]
    public async Task RecordLedgerEntry_NoSummary_CreatesSummaryAndLedger()
    {
        var tenantId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new StorageAccountingService();

        await service.RecordLedgerEntryAsync(
            tenantId: tenantId,
            deltaBytes: 250,
            operationType: "upload",
            projectId: Guid.NewGuid(),
            projectDocumentId: Guid.NewGuid(),
            performedByUserId: Guid.NewGuid(),
            reference: "seed",
            dbContext: db);

        Assert.Single(db.StorageUsageSummaries);
        Assert.Single(db.StorageUsageLedgers);
        Assert.Equal(250, db.StorageUsageSummaries.Single().UsedBytes);
        Assert.Equal(250, db.StorageUsageLedgers.Single().ResultingUsedBytes);
    }

    [Fact]
    public async Task RecordLedgerEntry_WhenDeltaWouldGoNegative_ClampsUsageToZero()
    {
        var tenantId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new StorageAccountingService();

        db.StorageUsageSummaries.Add(new StorageUsageSummary
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UsedBytes = 100,
            ReservedBytes = 0,
            LastCalculatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        await service.RecordLedgerEntryAsync(
            tenantId: tenantId,
            deltaBytes: -250,
            operationType: "delete",
            projectId: null,
            projectDocumentId: null,
            performedByUserId: null,
            reference: "delete-overflow",
            dbContext: db);

        Assert.Equal(0, db.StorageUsageSummaries.Single().UsedBytes);
        Assert.Equal(0, db.StorageUsageLedgers.OrderByDescending(x => x.OccurredAtUtc).First().ResultingUsedBytes);
    }
}
